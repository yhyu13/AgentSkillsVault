"""Trigger capture on injected UE editor, then nudge the editor window with
synthetic WM_MOUSEMOVE (no real cursor movement) so the idle viewport
invalidates and presents a frame. Waits for NewCapture, copies to final path.

Usage: python trigger_and_nudge.py <output.rdc> <ue_pid>
"""
import ctypes
import ctypes.wintypes
import os
import shutil
import sys
import time

sys.path.insert(0, r"C:\Users\yuhang\AppData\Local\rdc\renderdoc")
import renderdoc as rd

WM_MOUSEMOVE = 0x0200


def find_main_hwnd(pid):
    u32 = ctypes.windll.user32
    found = []

    @ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
    def cb(hwnd, _):
        if not u32.IsWindowVisible(hwnd):
            return True
        wpid = ctypes.c_ulong()
        u32.GetWindowThreadProcessId(hwnd, ctypes.byref(wpid))
        if wpid.value == pid:
            n = u32.GetWindowTextLengthW(hwnd)
            if n > 0:
                buf = ctypes.create_unicode_buffer(n + 1)
                u32.GetWindowTextW(hwnd, buf, n + 1)
                found.append((hwnd, buf.value))
        return True

    u32.EnumWindows(cb, 0)
    # prefer the window with the largest area = main frame
    best = None
    best_area = -1
    for hwnd, title in found:
        rect = ctypes.wintypes.RECT()
        if u32.GetWindowRect(hwnd, ctypes.byref(rect)):
            area = (rect.right - rect.left) * (rect.bottom - rect.top)
            if area > best_area:
                best_area = area
                best = hwnd
    return best


def nudge(hwnd):
    """Sweep synthetic WM_MOUSEMOVE across the client area grid so the Slate
    viewport widget (wherever it is) gets hover events and invalidates."""
    u32 = ctypes.windll.user32
    rect = ctypes.wintypes.RECT()
    u32.GetClientRect(hwnd, ctypes.byref(rect))
    w = rect.right - rect.left
    h = rect.bottom - rect.top
    x = 20
    while x < w:
        y = 20
        while y < h:
            lparam = (y << 16) | (x & 0xFFFF)
            u32.PostMessageW(hwnd, WM_MOUSEMOVE, 0, lparam)
            y += 40
        x += 40
    # also touch the center of each quadrant once more
    for cx in (w // 4, w // 2, 3 * w // 4):
        for cy in (h // 4, h // 2, 3 * h // 4):
            u32.PostMessageW(hwnd, WM_MOUSEMOVE, 0, (cy << 16) | (cx & 0xFFFF))


def find_connected_ident(target_pid, timeout=30):
    deadline = time.time() + timeout
    while time.time() < deadline:
        idents = []
        it = rd.EnumerateRemoteTargets("localhost", 0)
        while it != 0:
            idents.append(it)
            it = rd.EnumerateRemoteTargets("localhost", it)
        for ident in idents:
            try:
                tc = rd.CreateTargetControl("", ident, "kilo-nudge", True)
            except Exception:
                continue
            if tc is not None and tc.Connected():
                pid = tc.GetPID()
                print(f"  candidate ident={ident} pid={pid}")
                if pid == target_pid:
                    return ident, tc
                tc.Shutdown()
        time.sleep(1)
    return 0, None


def send_ctrl_r(hwnd):
    """Focus editor window and inject Ctrl+R (toggle viewport realtime)."""
    u32 = ctypes.windll.user32
    u32.SetForegroundWindow(hwnd)
    time.sleep(0.3)
    KEYEVENTF_KEYUP = 0x0002
    u32.keybd_event(0x11, 0, 0, 0)             # VK_CONTROL down
    time.sleep(0.1)
    u32.keybd_event(ord('R'), 0, 0, 0)         # R down
    time.sleep(0.1)
    u32.keybd_event(ord('R'), 0, KEYEVENTF_KEYUP, 0)
    time.sleep(0.1)
    u32.keybd_event(0x11, 0, KEYEVENTF_KEYUP, 0)
    print("Ctrl+R injected (viewport realtime toggle)")
    time.sleep(2.0)


def real_click_center(hwnd):
    """Move the real cursor to the window center and click (focus+invalidate
    whatever panel is there — usually the 3D viewport)."""
    u32 = ctypes.windll.user32
    rect = ctypes.wintypes.RECT()
    u32.GetWindowRect(hwnd, ctypes.byref(rect))
    x = (rect.left + rect.right) // 2
    y = rect.top + (rect.bottom - rect.top) // 3  # upper-center: viewport zone
    u32.SetForegroundWindow(hwnd)
    time.sleep(0.3)
    u32.SetCursorPos(x, y)
    time.sleep(0.2)
    MOUSEEVENTF_LEFTDOWN = 0x0002
    MOUSEEVENTF_LEFTUP = 0x0004
    u32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
    time.sleep(0.1)
    u32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
    print(f"real click at ({x},{y}) — focus + invalidate")
    time.sleep(1.0)


def main():
    final_path = sys.argv[1]
    target_pid = int(sys.argv[2])
    mode = sys.argv[3] if len(sys.argv) > 3 else ""
    do_ctrlr = mode == "--ctrlr"
    do_click = mode == "--click"

    ident, tc = find_connected_ident(target_pid)
    if tc is None:
        print("FAILED: cannot connect to target")
        return 1
    print(f"connected ident={ident} pid={target_pid}")

    hwnd = find_main_hwnd(target_pid)
    print(f"main hwnd={hwnd}")

    if do_ctrlr and hwnd:
        send_ctrl_r(hwnd)
    if do_click and hwnd:
        real_click_center(hwnd)
        send_ctrl_r(hwnd)  # enable realtime after focusing the viewport

    # Drain, then queue the capture. Discard ANY pending messages including
    # stale NewCapture replays from earlier captures.
    seen_newcapture_paths = set()
    for _ in range(200):
        m = tc.ReceiveMessage(None)
        t = int(m.type)
        if t == 4 and m.newCapture is not None:
            seen_newcapture_paths.add(m.newCapture.path)
            continue  # stale replay from a previous capture, discard
        if t in (3, 1):
            break

    trigger_time = time.time()
    tc.TriggerCapture(1)
    print("Capture queued. Nudging editor window ...")

    cap_path = None
    deadline = time.time() + 60
    while time.time() < deadline:
        if hwnd:
            nudge(hwnd)
        m = tc.ReceiveMessage(None)
        t = int(m.type)
        if t == 4 and m.newCapture is not None:
            nc = m.newCapture
            if nc.path in seen_newcapture_paths:
                continue  # stale replay, keep waiting
            # freshness guard: file must not pre-date the trigger
            if os.path.exists(nc.path) and os.path.getmtime(nc.path) < trigger_time:
                seen_newcapture_paths.add(nc.path)
                continue
            print(f"Capture: {nc.path} frame={nc.frameNumber} size={nc.byteSize} api={nc.api}")
            cap_path = nc.path
            break
        if t == 1:
            print("FAILED: disconnected")
            break
        time.sleep(0.15)

    tc.Shutdown()

    if cap_path and os.path.exists(cap_path):
        os.makedirs(os.path.dirname(final_path), exist_ok=True)
        if os.path.abspath(cap_path) != os.path.abspath(final_path):
            try:
                shutil.copy2(cap_path, final_path)
            except PermissionError:
                print("WARN: copy blocked by file lock; keeping source path")
                final_path = cap_path
        print(f"OK: {final_path} ({os.path.getsize(final_path):,} bytes)")
        return 0
    print("FAILED: no capture received")
    return 1


if __name__ == "__main__":
    sys.exit(main())
