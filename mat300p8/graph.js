// graph.js
// ==============

// Helper: Create a text sprite with white text using high-res rendering
function makeTextSprite(message, parameters) {
    parameters = parameters || {};
    var fontface = parameters.fontface || "Arial";
    var fontsize = parameters.fontsize || 24;
    var borderThickness = parameters.borderThickness !== undefined ? parameters.borderThickness : 0;
    var backgroundColor = parameters.backgroundColor || { r: 255, g: 255, b: 255, a: 0.0 };
    
    // Use devicePixelRatio and boost it for extra resolution.
    var dpr = window.devicePixelRatio || 1;
    // Increase resolution scale beyond the default devicePixelRatio:
    var resolutionScale = dpr * 2;  // tweak this factor as needed
    
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    context.font = fontsize + "px " + fontface;
    var metrics = context.measureText(message);
    var textWidth = metrics.width;
    
    // Set canvas size at a higher resolution.
    canvas.width = (textWidth + borderThickness * 2) * resolutionScale;
    canvas.height = (fontsize * 1.4 + borderThickness * 2) * resolutionScale;
    
    // Scale the drawing context so text draws at correct proportions.
    context.scale(resolutionScale, resolutionScale);
    context.font = fontsize + "px " + fontface;
    
    // Draw transparent background.
    context.fillStyle = "rgba(" + backgroundColor.r + "," + backgroundColor.g + "," +
      backgroundColor.b + "," + backgroundColor.a + ")";
    context.fillRect(0, 0, canvas.width / resolutionScale, canvas.height / resolutionScale);
    
    // Draw the text in white.
    context.fillStyle = "rgba(255, 255, 255, 1.0)";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(message, (canvas.width / resolutionScale) / 2, (canvas.height / resolutionScale) / 2);
    
    // Create texture and set it to use linear filtering.
    var texture = new THREE.Texture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    
    var spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
    var sprite = new THREE.Sprite(spriteMaterial);
    
    // Scale sprite based on canvas dimensions.
    var spriteScaleFactor = 0.01 * fontsize;
    sprite.scale.set(spriteScaleFactor * canvas.width / resolutionScale, spriteScaleFactor * canvas.height / resolutionScale, 1);
    return sprite;
  }
  

  
  // Helper: Create grid lines on a specified plane.
  // 'plane' can be "XZ", "XY", or "YZ". The constant coordinate is zero.
  function createGridOnPlane(plane, range, step, lineColor, lineAlpha) {
    var gridGroup = new THREE.Group();
    var constantCoord = 0;
    
    // Draw grid lines along the first (a) and second (b) directions:
    for (var a = -range; a <= range; a += step) {
      var geometry = new THREE.BufferGeometry();
      var vertices;
      if (plane === "XZ") {
        vertices = new Float32Array([ a, constantCoord, -range, a, constantCoord, range ]);
      } else if (plane === "XY") {
        vertices = new Float32Array([ a, -range, constantCoord, a, range, constantCoord ]);
      } else if (plane === "YZ") {
        vertices = new Float32Array([ constantCoord, a, -range, constantCoord, a, range ]);
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      var material = new THREE.LineBasicMaterial({ color: lineColor, transparent: true, opacity: lineAlpha });
      var line = new THREE.Line(geometry, material);
      gridGroup.add(line);
    }
    
    for (var b = -range; b <= range; b += step) {
      var geometry = new THREE.BufferGeometry();
      var vertices;
      if (plane === "XZ") {
        vertices = new Float32Array([ -range, constantCoord, b, range, constantCoord, b ]);
      } else if (plane === "XY") {
        vertices = new Float32Array([ -range, b, constantCoord, range, b, constantCoord ]);
      } else if (plane === "YZ") {
        vertices = new Float32Array([ constantCoord, -range, b, constantCoord, range, b ]);
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      var material = new THREE.LineBasicMaterial({ color: lineColor, transparent: true, opacity: lineAlpha });
      var line = new THREE.Line(geometry, material);
      gridGroup.add(line);
    }
    
    return gridGroup;
  }
  
  // Helper: Create labels only on the axis lines.
  // For the X-axis, labels are placed along (x, 0, 0); for Y-axis along (0, y, 0); for Z-axis along (0, 0, z).
  function createAxisLabels(range, step, labelFont, labelSize) {
    var labelGroup = new THREE.Group();
    
    // Labels on X-axis.
    for (var x = -range; x <= range; x += range) {
      var labelText = "(" + x + ", 0, 0)";
      var sprite = makeTextSprite(labelText, { fontface: labelFont, fontsize: labelSize, borderThickness: 0 });
      sprite.position.set(x, 0, 0);
      labelGroup.add(sprite);
    }
    
    // Labels on Y-axis.
    for (var y = -range; y <= range; y += range) {
      if (y == 0) continue; // Skip the origin label for Y-axis
      var labelText = "(0, " + y + ", 0)";
      var sprite = makeTextSprite(labelText, { fontface: labelFont, fontsize: labelSize, borderThickness: 0 });
      sprite.position.set(0, y, 0);
      labelGroup.add(sprite);
    }
    
    // Labels on Z-axis.
    for (var z = -range; z <= range; z += range) {
      if (z == 0) continue; // Skip the origin label for Z-axis
      var labelText = "(0, 0, " + z + ")";
      var sprite = makeTextSprite(labelText, { fontface: labelFont, fontsize: labelSize, borderThickness: 0 });
      sprite.position.set(0, 0, z);
      labelGroup.add(sprite);
    }
    
    return labelGroup;
  }
  
  // Main function: Creates a 3D grid with grid lines on the XZ, XY, and YZ planes
  // and adds labels only along the three axes.
  // Options (all optional):
  //   range: extent of grid (default: 3)
  //   step: spacing (default: 1)
  //   lineColor: hex color for grid lines (default: 0xaaaaaa)
  //   lineAlpha: opacity for grid lines (default: 0.2)
  //   labelFont: font (default: "Arial")
  //   labelSize: size of label font (default: 24)
  function createGraph3DGrid(options) {
    options = options || {};
    var range = options.range !== undefined ? options.range : 3;
    var step = options.step !== undefined ? options.step : 1;
    var lineColor = options.lineColor !== undefined ? options.lineColor : 0xaaaaaa;
    var lineAlpha = options.lineAlpha !== undefined ? options.lineAlpha : 0.2;
    var labelFont = options.labelFont || "Arial";
    var labelSize = options.labelSize !== undefined ? options.labelSize : 24;
  
    var overallGroup = new THREE.Group();
    
    // Create grid lines on each of the three planes.
    overallGroup.add(createGridOnPlane("XZ", range, step, lineColor, lineAlpha));
    overallGroup.add(createGridOnPlane("XY", range, step, lineColor, lineAlpha));
    overallGroup.add(createGridOnPlane("YZ", range, step, lineColor, lineAlpha));
    
    // Add labels only along the coordinate axes.
    overallGroup.add(createAxisLabels(range, step, labelFont, labelSize));
    
    return overallGroup;
}