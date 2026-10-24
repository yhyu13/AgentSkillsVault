# Clay Craft Reference

These are implementation patterns, not mandates to replace existing project utilities. Check the installed Three.js API before using unfamiliar parameters.

## 1. Geometry before shading

Build a part tree from large to small:

```text
subject root
├── primary silhouette / largest mass
├── secondary structural masses
├── identifying features (the 3–5 shapes that make it recognizable)
├── contact points / supports / wheels / feet
└── visible mechanical or architectural detail
```

At each level ask whether the part reads at the default camera. If not, enlarge, remove, or reposition it before adding more parts.

Useful procedural forms:

- boxes with bevel-like layered masses for architecture and vehicles;
- cylinders/lathes for axles, pipes, columns, wheels, and rotational parts;
- tubes/curves for rails, cables, roads, and paths;
- extrusions for profiles and signage silhouettes;
- merged static geometry or instancing for repeated props.

Avoid coplanar duplicate surfaces. Use real thickness and stable contact points. Be deliberate about smoothing: flat normals can clarify low-poly planes; smooth normals suit continuous curved surfaces. Do not smooth across a hard mechanical edge accidentally.

## 2. Monochrome palette

A small palette is enough:

```js
const clay = {
  background: 0x20242a,
  primary: 0xc9c9c4,
  secondary: 0x858b91,
  recess: 0x484d52
};
```

These values are a starting example, not a required style. Validate with the project's output color space and tone mapping. The key relationship is contrast: hero, environment, recess, and background must not collapse into the same value.

Create shared materials through one factory:

```js
function createClayMaterials() {
  const primary = new THREE.MeshStandardMaterial({
    color: 0xc9c9c4, roughness: 0.82, metalness: 0
  });
  const secondary = new THREE.MeshStandardMaterial({
    color: 0x858b91, roughness: 0.88, metalness: 0
  });
  const recess = new THREE.MeshStandardMaterial({
    color: 0x484d52, roughness: 0.95, metalness: 0
  });
  return { primary, secondary, recess };
}
```

Do not assign `map`, `normalMap`, `roughnessMap`, `aoMap`, `envMap`, or other texture inputs. For a stricter single-color requirement, use one clay color and let lighting/geometry produce value differences instead of using the secondary/recess colors.

## 3. Simple lighting rig

Illustrative structure:

```js
const fill = new THREE.HemisphereLight(0xdde6f0, 0x34302c, 1.2);
const key = new THREE.DirectionalLight(0xffffff, 2.0);
key.position.set(6, 10, 4);
scene.add(fill, key);
```

Intensity and exposure are interdependent and renderer-version/project dependent. Treat the snippet as topology, not universal values. Start with one key and fill; adjust using captured frames. Do not keep adding lights to compensate for bad geometry or a poor camera.

For shadows:

- only the key casts by default;
- fit the shadow camera to actual content;
- bias/normalBias tuning must be checked for acne and detached “Peter Pan” shadows;
- large environment receivers and important subject casters matter more than every screw;
- provide a no-shadow/low-quality path if measurement justifies it.

## 4. Camera fitting pattern

Compute bounds after the blockout is assembled and transforms updated. Fit using the bounding sphere or projected box corners, accounting for vertical and horizontal FOV and aspect. Add margin for UI and motion.

Do not use one fixed distance for all aspect ratios. A narrow viewport often needs a different distance or composition. Verify the actual controls target and camera near/far planes; excessive near/far ratios can worsen depth precision.

Named views should be deterministic:

```text
hero     = requested default composition
overview = entire layout and ground contacts
side     = volume and depth
back     = unseen geometry and intersections
detail   = identifying features and normals
```

## 5. Runtime material audit

A project-local audit can enumerate material texture slots rather than relying on source grep:

```js
const TEXTURE_SLOTS = [
  "map", "alphaMap", "aoMap", "bumpMap", "normalMap",
  "displacementMap", "roughnessMap", "metalnessMap",
  "emissiveMap", "envMap", "lightMap", "specularMap",
  "clearcoatMap", "clearcoatNormalMap", "clearcoatRoughnessMap",
  "sheenColorMap", "sheenRoughnessMap", "transmissionMap",
  "thicknessMap", "iridescenceMap", "iridescenceThicknessMap"
];

function findSurfaceTextures(root) {
  const found = [];
  const seen = new Set();
  root.traverse((object) => {
    if (!object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material || seen.has(material)) continue;
      seen.add(material);
      for (const slot of TEXTURE_SLOTS) {
        if (material[slot]?.isTexture) {
          found.push({ object: object.name, material: material.name, slot });
        }
      }
    }
  });
  return found;
}
```

Keep the slot list aligned with material types actually used. Expected result in Clay: `[]`. `scene.environment` and `scene.background` also need inspection: a solid color background is valid; a texture background/environment is not the default Clay path. Shader materials require separate uniform inspection because they can hide texture inputs in custom uniforms.

## 6. Resource-safe factories

A module should track what it owns:

```js
export function createClayPart(ctx) {
  const root = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0xc9c9c4, roughness: 0.85 });
  const mesh = new THREE.Mesh(geometry, material);
  root.add(mesh);
  ctx.scene.add(root);
  let disposed = false;

  return {
    root,
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      geometry.dispose();
      material.dispose();
    }
  };
}
```

Real scenes often share resources; then the creator/registry owns them and this per-module pattern must not double-dispose. Never call `renderer.dispose()` from a worker module.

## 7. Visual review rubric

Inspect images for:

- **Recognition:** subject and function are understandable without labels/textures.
- **Silhouette:** identifying parts do not merge at required views.
- **Volume:** front, side, and top separate; curved surfaces have intended normals.
- **Contact:** objects meet ground/supports; shadows do not float or acne.
- **Composition:** subject is neither tiny nor cropped; narrow aspect remains usable.
- **Precision:** no z-fighting, accidental gaps, visible intersections, or far-plane clipping.
- **Restraint:** detail supports form; no postprocessing compensates for weak blockout.

Record defects by view and location, fix the root cause, then recapture the same view.

## 8. Full-version handoff inventory

Before finishing Clay, record:

```text
seed and named random streams
semantic root/material names
geometry module ownership and bounds
camera poses used for comparison
shared material factory location
quality levers actually implemented
known geometry compromises not to hide with textures
```

This inventory lets the Full agent change appearance without destabilizing geometry, input, camera, or lifecycle.
