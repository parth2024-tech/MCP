---
name: cad-engineering
description: "Model parametric mechanical parts, 3D CAD assemblies, and printable geometry using CadQuery and FreeCAD Python."
---

# CAD Engineering & Parametric Mechanical Modeling

Author parametric 3D CAD geometry, mechanical assemblies, and 3D-printable parts using code-first engines (CadQuery and FreeCAD Python API).

## Core Capabilities
- **Parametric 3D Solid Modeling**: Workplanes, 2D sketches, extrusions, cuts, revolves, lofts, fillets, and chamfers.
- **Assembly & Kinematics**: Multi-part mechanical systems, constraints, joints, fasteners, and multi-axis linkages (e.g. robotic arms, gear trains).
- **Manufacturing & Export**: STEP (`.step`, `.stp`) for standard CAD interchange, STL (`.stl`) for additive manufacturing/3D printing, and DXF (`.dxf`) for CNC/laser cutting.

## Methodologies

### 1. CadQuery Modern Paradigm
CadQuery is a fluent, Pythonic parametric CAD scripting framework based on Open CASCADE (OCCT):

```python
import cadquery as cq

# Parametric dimensions
length = 80.0
width = 60.0
thickness = 10.0
hole_diameter = 8.0
fillet_radius = 4.0

# Build base plate with counterbored mounting holes
part = (
    cq.Workplane("XY")
    .box(length, width, thickness)
    .edges("|Z")
    .fillet(fillet_radius)
    .faces(">Z")
    .workplane()
    .rect(length - 20, width - 20, forConstruction=True)
    .vertices()
    .cboreHole(hole_diameter, cboreDiameter=12.0, cboreDepth=4.0, depth=thickness)
)

# Export STEP for CAD interchange and STL for 3D printing
cq.exporters.export(part, "base_plate.step")
cq.exporters.export(part, "base_plate.stl", tolerance=0.01, angularTolerance=0.1)
```

### 2. FreeCAD Python Scripting Pattern
For headless FreeCAD execution or FreeCAD macro pipelines:

```python
import FreeCAD as App
import Part

doc = App.newDocument("RobotArmLink")

# Create parametric link body
box = Part.makeBox(120, 30, 20)
cylinder = Part.makeCylinder(15, 20, App.Vector(0, 15, 0), App.Vector(0, 0, 1))
link_solid = box.fuse(cylinder)

# Bore bearing hole
bearing_hole = Part.makeCylinder(8, 20, App.Vector(0, 15, 0), App.Vector(0, 0, 1))
link_final = link_solid.cut(bearing_hole)

part_obj = doc.addObject("Part::Feature", "ArmLink")
part_obj.Shape = link_final
doc.recompute()

Part.export([part_obj], "robot_arm_link.step")
```

## Engineering Invariants
1. **Always Parameterize Dimensions**: Never hardcode coordinate offsets directly; define named variables (length, clearance, tolerance, wall thickness).
2. **Manufacturability & Tolerances**:
   - 3D Printing clearance: Add $0.2\,\text{mm}$ to $0.4\,\text{mm}$ clearance for interlocking/sliding fits.
   - Chamfer vs Fillet: Use chamfers ($45^\circ$) on base contact faces for 3D printing to prevent elephant-foot artifacts; use fillets on high-stress inner corners to reduce stress concentration ($K_t$).
3. **Watertight & Manifold Verification**: STL meshes must be manifold (closed 2-manifold) with consistent outward normals.
4. **Assembly Alignment**: Base coordinate frames ($X, Y, Z$) must align logically with mating references.
