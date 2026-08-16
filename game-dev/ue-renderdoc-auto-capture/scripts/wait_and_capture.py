"""Wait for the injected UE process to present frames (CapturableWindowCount>0),
then trigger a 1-frame capture, wait for NewCapture, copy to final path.

Usage: python wait_and_capture.py <output.rdc> <ue_pid> [window_timeout_secs]
"""
import os
import shutil
import sys
import time

sys.path.insert(0, r"C:\Users\yuhang\AppData\Local\rdc\renderdoc")
import renderdoc as rd


def find_connected_ident(target_pid, timeout=20):
    """Return (ident, tc) for the target whose PID == target_pid, retrying."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        idents = []
        it = rd.EnumerateRemoteTargets("localhost", 0)
        while it != 0:
            idents.append(it)
            it = rd.EnumerateRemoteTargets("localhost", it)
        for ident in idents:
            try:
                tc = rd.CreateTargetControl("", ident, "kilo-wait", True)
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


def drain(tc, count=50):
    for _ in range(count):
        m = tc.ReceiveMessage(None)
        if int(m.type) in (3, 1):
            return


def main():
    final_path = sys.argv[1]
    target_pid = int(sys.argv[2])
    window_timeout = int(sys.argv[3]) if len(sys.argv) > 3 else 360

    ident, tc = find_connected_ident(target_pid, timeout=30)
    if tc is None:
        print("FAILED: cannot find/connect target")
        return 1
    print(f"connected: ident={ident} pid={target_pid}")

    # Wait until the swapchain presents (CapturableWindowCount > 0)
    print("Waiting for capturable window (swapchain presenting) ...")
    signaled = False
    deadline = time.time() + window_timeout
    while time.time() < deadline:
        m = tc.ReceiveMessage(None)
        t = int(m.type)
        if t == 9:  # CapturableWindowCount
            cnt = getattr(m, 'capturableWindowCount', 1)
            print(f"  CapturableWindowCount={cnt}")
            if cnt > 0:
                signaled = True
                break
        elif t == 1:
            print("FAILED: disconnected while waiting for window")
            return 1
        time.sleep(0.05)
    if not signaled:
        print("FAILED: no window presented within timeout")
        return 1

    print("Window presenting. Grace 10s, then trigger ...")
    time.sleep(10)
    drain(tc)
    tc.TriggerCapture(1)

    cap_path = None
    deadline = time.time() + 120
    while time.time() < deadline:
        m = tc.ReceiveMessage(None)
        t = int(m.type)
        if t == 4 and m.newCapture is not None:
            nc = m.newCapture
            print(f"Capture: {nc.path} frame={nc.frameNumber} size={nc.byteSize} api={nc.api}")
            cap_path = nc.path
            break
        if t == 1:
            print("FAILED: disconnected during capture")
            break
        time.sleep(0.05)

    tc.Shutdown()

    if cap_path and os.path.exists(cap_path):
        os.makedirs(os.path.dirname(final_path), exist_ok=True)
        shutil.copy2(cap_path, final_path)
        print(f"OK: {final_path} ({os.path.getsize(final_path):,} bytes)")
        return 0
    print("FAILED: no capture received")
    return 1


if __name__ == "__main__":
    sys.exit(main())
