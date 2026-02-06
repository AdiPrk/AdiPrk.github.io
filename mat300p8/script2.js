// -- THREE.js Scene Setup --
var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(10, 10, 10);
camera.lookAt(new THREE.Vector3(0, 0, 0));

var canvas = document.getElementById('canvas');

var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

var controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.mouseButtons = {
  LEFT: null,               // Disable left click for OrbitControls
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.ROTATE,
};

var ambientLight = new THREE.AmbientLight(0x404040, 1.5);
scene.add(ambientLight);

var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// -- Helper Functions for Drawing --
var dashLineMaterial = new THREE.LineDashedMaterial({
  color: 0xaaaaaa,
  dashSize: 0.15,
  gapSize: 0.05,
  opacity: 0.7,
  transparent: true,
});
function DrawDashedLine3D(x1, y1, z1, x2, y2, z2) { 
  var geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(x1, y1, z1),
    new THREE.Vector3(x2, y2, z2)
  ]);
  var line = new THREE.Line(geometry, dashLineMaterial);
  line.computeLineDistances(); // Required for dashed lines
  scene.add(line);
  return line;
}

function DrawSphere(x, y, z, radius, color, alpha) {
  var geometry = new THREE.SphereGeometry(radius, 3, 3);
  var material = new THREE.MeshPhongMaterial({ color: color, transparent: true, opacity: alpha });
  var sphere = new THREE.Mesh(geometry, material);
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  sphere.position.set(x, y, z);
  scene.add(sphere);
  return sphere;
}

// -- UI Controls --
var formDropdown = document.getElementById("formDropdown");
var selectedForm = formDropdown.value;
formDropdown.addEventListener("change", function() {
  selectedForm = formDropdown.value;
  if (bezier) {
    bezier.method = selectedForm;
  }
  console.log("Selected form:", selectedForm);
});

var tValueSlider = document.getElementById("tValueSlider");
var tValueDisplay = document.getElementById("tValueDisplay");
var tValue = parseFloat(tValueSlider.value);
tValueSlider.addEventListener("input", function() {
  tValue = parseFloat(tValueSlider.value);
  tValueDisplay.innerText = tValue.toFixed(3);
  console.log("T-value:", tValue);
});

// -- 3D Grid --
var grid3D = createGraph3DGrid({
  range: 5,
  step: 1,
  lineColor: 0xaaaaaa,
  lineAlpha: 0.2,
  labelFont: "Arial",
  labelSize: 6
});
scene.add(grid3D);

var points3D = [];

function distance3D(x1, y1, z1, x2, y2, z2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
}

class Point3D {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.selected = false;
    this.sphere = DrawSphere(x, y, z, 0.2, 0xffffff, 0.9);
  }
  updatePosition(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.sphere.position.set(x, y, z);
  }
  updateAppearance() {
    // Change color based on selection.
    if (this.selected) {
      this.sphere.material.color.set(0x00ff00); // Green when selected.
    } else {
      this.sphere.material.color.set(0xffffff);
    }
  }
}

class BezierCurve3D {
  constructor(controlPoints, method = "NLI-form") {
    this.controlPoints = controlPoints;
    this.method = method; // Options: "NLI-form", "BB-form", "Midpoint Subdivision"
    this.shells = [];
    this.shellObjects = [];      // To track temporary shell objects.
    this.controlLineObjects = []; // To track control point dashed lines.
    this.curveLine = null;
  }

  computeNLI(t, points, storeStuff = false) {
    if (points.length === 1) {
      return points[0];
    }
    let newPoints = [];
    for (let i = 0; i < points.length - 1; i++) {
      let p0 = points[i];
      let p1 = points[i + 1];
      let x = (1 - t) * p0.x + t * p1.x;
      let y = (1 - t) * p0.y + t * p1.y;
      let z = (1 - t) * p0.z + t * p1.z;
      newPoints.push({ x, y, z });
    }
    if (storeStuff) {
      this.shells.push(newPoints);
    }
    return this.computeNLI(t, newPoints, storeStuff);
  }

  computeBB(t) {
    let n = this.controlPoints.length - 1;
    let result = { x: 0, y: 0, z: 0 };
    for (let i = 0; i <= n; i++) {
      let binomial =
        this.binomialCoefficient(n, i) *
        Math.pow(1 - t, n - i) *
        Math.pow(t, i);
      result.x += binomial * this.controlPoints[i].x;
      result.y += binomial * this.controlPoints[i].y;
      result.z += binomial * this.controlPoints[i].z;
    }
    return result;
  }

  binomialCoefficient(n, k) {
    let coeff = 1;
    for (let i = 0; i < k; i++) {
      coeff *= (n - i) / (i + 1);
    }
    return coeff;
  }

  midpointSubdivision(points, depth) {
    if (depth === 0) return points;
    let left = [points[0]];
    let right = [points[points.length - 1]];
    let midpoints = [...points];
    while (midpoints.length > 1) {
      let newMidpoints = [];
      for (let i = 0; i < midpoints.length - 1; i++) {
        let x = (midpoints[i].x + midpoints[i + 1].x) / 2;
        let y = (midpoints[i].y + midpoints[i + 1].y) / 2;
        let z = (midpoints[i].z + midpoints[i + 1].z) / 2;
        newMidpoints.push({ x, y, z });
      }
      left.push(newMidpoints[0]);
      right.unshift(newMidpoints[newMidpoints.length - 1]);
      midpoints = newMidpoints;
    }
    return [
      ...this.midpointSubdivision(left, depth - 1),
      midpoints[0],
      ...this.midpointSubdivision(right, depth - 1)
    ];
  }

  update() {
  }

  draw() {
    if (this.controlPoints.length < 2) return;

    // Remove previous control point connectors.
    if (this.controlLineObjects.length) {
      this.controlLineObjects.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      this.controlLineObjects = [];
    }
    // Draw dashed lines between control points (if more than 2 exist).
    if (this.controlPoints.length > 2) {
      for (let i = 0; i < this.controlPoints.length - 1; i++) {
        let line = DrawDashedLine3D(
          this.controlPoints[i].x,
          this.controlPoints[i].y,
          this.controlPoints[i].z,
          this.controlPoints[i + 1].x,
          this.controlPoints[i + 1].y,
          this.controlPoints[i + 1].z
        );
        this.controlLineObjects.push(line);
      }
    }
    // Remove previous curve line and shell objects.
    if (this.curveLine) {
      scene.remove(this.curveLine);
      this.curveLine.geometry.dispose();
      this.curveLine = null;
    }
    if (this.shellObjects.length) {
      this.shellObjects.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      this.shellObjects = [];
    }

    let curvePoints = [];
    this.shells = [];
    let steps = 100;
    if (this.method === "NLI-form") {
      for (let i = 0; i <= steps; i++) {
        let t = i / steps;
        curvePoints.push(this.computeNLI(t, this.controlPoints));
      }
      this.computeNLI(parseFloat(tValueSlider.value), this.controlPoints, true);
    } else if (this.method === "BB-form") {
      for (let i = 0; i <= steps; i++) {
        curvePoints.push(this.computeBB(i / steps));
      }
    } else if (this.method === "Midpoint Subdivision") {
      curvePoints = this.midpointSubdivision(this.controlPoints, 4);
    }

    // Create geometry for the curve line.
    let geometry = new THREE.BufferGeometry();
    let positions = new Float32Array(curvePoints.length * 3);
    for (let i = 0; i < curvePoints.length; i++) {
      positions[3 * i] = curvePoints[i].x;
      positions[3 * i + 1] = curvePoints[i].y;
      positions[3 * i + 2] = curvePoints[i].z;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    let material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
    this.curveLine = new THREE.Line(geometry, material);
    scene.add(this.curveLine);

    // Draw shells from the NLI process if applicable.
    if (this.method === "NLI-form" && this.shells.length > 0) {
      for (let s = 0; s < this.shells.length; s++) {
        const shell = this.shells[s];
        for (let i = 0; i < shell.length; i++) {
          let shellSphere = DrawSphere(shell[i].x, shell[i].y, shell[i].z, 0.1, 0xaaaaaa, 0.5);
          this.shellObjects.push(shellSphere);
          if (i > 0) {
            let dashedLine = DrawDashedLine3D(
              shell[i - 1].x, shell[i - 1].y, shell[i - 1].z,
              shell[i].x, shell[i].y, shell[i].z,
            );
            this.shellObjects.push(dashedLine);
          }
        }
      }
    }
  }
}

// Create the Bézier curve object.
var bezier = new BezierCurve3D(points3D, selectedForm);

// ----------------- Dragging Functionality with TransformControls -----------------

// Global variables for raycasting and selection.
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var selectedPoint = null;

// Create TransformControls and add them to the scene.
var transformControls = new THREE.TransformControls(camera, renderer.domElement);
scene.add(transformControls);

// When the TransformControls object is dragging, disable OrbitControls.
transformControls.addEventListener('dragging-changed', function (event) {
  controls.enabled = !event.value;
});

// Update the selected point’s logical coordinates as it is dragged.
transformControls.addEventListener('change', function () {
  if (selectedPoint) {
    selectedPoint.updatePosition(
      selectedPoint.sphere.position.x,
      selectedPoint.sphere.position.y,
      selectedPoint.sphere.position.z
    );
  }
});

// Revised onMouseDown handler to support both adding new points and dragging.
function onMouseDown(event) {
  // Only act on left-click.
  if (event.button !== 0) return;

  let rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);

  // Check if a control point (sphere) was clicked.
  let spheres = points3D.map(pt => pt.sphere);
  let intersects = raycaster.intersectObjects(spheres);
  if (intersects.length > 0) {
    // A sphere was hit. Select that point and attach TransformControls.
    let clickedSphere = intersects[0].object;
    selectedPoint = points3D.find(pt => pt.sphere === clickedSphere);
    // Mark all points unselected first.
    points3D.forEach(pt => pt.selected = false);
    selectedPoint.selected = true;
    selectedPoint.updateAppearance();
    transformControls.attach(clickedSphere);
    console.log("Dragging point at", clickedSphere.position);
  } else {
    // If no control point was clicked, detach any active controls...
    if (selectedPoint) {
        transformControls.detach();
        selectedPoint.selected = false;
        selectedPoint.updateAppearance();
        selectedPoint = null;
    }
    else {   
        // ...and add a new control point on the XZ plane (y = 0).
        let plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        let intersectionPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersectionPoint);
        if (intersectionPoint) {
        let newPoint = new Point3D(intersectionPoint.x, intersectionPoint.y, intersectionPoint.z);
        points3D.push(newPoint);
        bezier.controlPoints = points3D;
        console.log("New point added at", intersectionPoint);
        }
    }
  }
}
renderer.domElement.onclick = (e) => onMouseDown(e);

// -- Handle Window Resize --
window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ----------------- Main Animation Loop -----------------
function animate() {
  requestAnimationFrame(animate);
  controls.update();

  // Update and redraw the Bézier curve.
  bezier.update();
  bezier.draw();

  // Update the appearance of each control point (to reflect selection changes).
  points3D.forEach(point => point.updateAppearance());

  renderer.render(scene, camera);
}
animate();
