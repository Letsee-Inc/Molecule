var touchX;
var touchY;

var root;
var objects = [];
var loader;
var colorSpriteMap = {};
var baseSprite;
var tmpVec1;
var tmpVec2;
var tmpVec3;
var tmpVec4;

function init() {
	loader = new THREE.PDBLoader();
	baseSprite = document.createElement('img');
	baseSprite.src = 'assets/ball.png';

	tmpVec1 = new THREE.Vector3();
	tmpVec2 = new THREE.Vector3();
	tmpVec3 = new THREE.Vector3();
	tmpVec4 = new THREE.Vector3();

	root = new THREE.Object3D();
}

function colorify(ctx, width, height, color, a) {
	var r = color.r;
	var g = color.g;
	var b = color.b;

	var imageData = ctx.getImageData(0, 0, width, height);
	var data = imageData.data;

	for (var y = 0; y < height; y++) {
		for (var x = 0; x < width; x++) {
			var index = ( y * width + x ) * 4;
			data[ index ] *= r;
			data[ index + 1 ] *= g;
			data[ index + 2 ] *= b;
			data[ index + 3 ] *= a;
		}
	}

	ctx.putImageData(imageData, 0, 0);
}

function imageToCanvas(image) {
	var width = image.width;
	var height = image.height;

	var canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;

	var context = canvas.getContext('2d');
	context.drawImage(image, 0, 0, width, height);

	return canvas;
}

function loadMolecule(uri, pdbfilepath) {
	for (var i = 0; i < objects.length; i++) {
		var object = objects[ i ];
		object.parent.remove(object);
	}

	objects = [];
	letsee.Renderer.removeChildObject(uri, root);

	loader.load(pdbfilepath, function(geometry, geometryBonds) {
		var offset = THREE.GeometryUtils.center(geometry);
		geometryBonds.applyMatrix(new THREE.Matrix4().makeTranslation(offset.x, offset.y, offset.z));

		for (i = 0; i < geometry.vertices.length; i++) {
			var position = geometry.vertices[ i ];
			var color = geometry.colors[ i ];
			var element = geometry.elements[ i ];

			if (!colorSpriteMap[ element ]) {
				var canvas = imageToCanvas(baseSprite);
				var context = canvas.getContext('2d');

				colorify(context, canvas.width, canvas.height, color, 1);

				var dataUrl = canvas.toDataURL();
				colorSpriteMap[ element ] = dataUrl;
			}

			colorSprite = colorSpriteMap[ element ];

			var atom = document.createElement('img');
			atom.src = colorSprite;

			var object = new THREE.CSS3DSprite(atom);
			object.element.style.height = object.userData.bondLengthShort;
			object.position.copy(position);
			object.position.multiplyScalar(75);

			object.matrixAutoUpdate = false;
			object.updateMatrix();

			root.add(object);
			objects.push(object);
		}

		for (var i = 0; i < geometryBonds.vertices.length; i += 2) {
			var start = geometryBonds.vertices[ i ];
			var end = geometryBonds.vertices[ i + 1 ];

			start.multiplyScalar(75);
			end.multiplyScalar(75);

			tmpVec1.subVectors(end, start);
			var bondLength = tmpVec1.length() - 50;

			var bond = document.createElement('div');
			bond.className = "bond";
			bond.style.height = bondLength + "px";

			var object = new THREE.CSS3DObject(bond);
			object.position.copy(start);
			object.position.lerp(end, 0.5);

			object.userData.bondLengthShort = bondLength + "px";
			object.userData.bondLengthFull = ( bondLength + 55 ) + "px";

			var axis = tmpVec2.set(0, 1, 0).cross(tmpVec1);
			var radians = Math.acos(tmpVec3.set(0, 1, 0).dot(tmpVec4.copy(tmpVec1).normalize()));

			var objMatrix = new THREE.Matrix4().makeRotationAxis(axis.normalize(), radians);
			object.matrix = objMatrix;
			object.rotation.setFromRotationMatrix(object.matrix, object.rotation.order);

			object.matrixAutoUpdate = false;
			object.updateMatrix();

			root.add(object);
			objects.push(object);

			var bond = document.createElement('div');
			bond.className = "bond";
			bond.style.height = bondLength + "px";

			var joint = new THREE.Object3D(bond);
			joint.position.copy(start);
			joint.position.lerp(end, 0.5);

			joint.matrix.copy(objMatrix);
			joint.rotation.setFromRotationMatrix(joint.matrix, joint.rotation.order);

			joint.matrixAutoUpdate = false;
			joint.updateMatrix();

			var object = new THREE.CSS3DObject(bond);
			object.rotation.y = Math.PI / 2;

			object.matrixAutoUpdate = false;
			object.updateMatrix();

			object.userData.bondLengthShort = bondLength + "px";
			object.userData.bondLengthFull = ( bondLength + 55 ) + "px";

			object.userData.joint = joint;

			joint.add(object);
			root.add(joint);
			objects.push(object);
		}

		letsee.Renderer.addChildObject(uri, root);
	});
}

function onDocumentTouchStart(event) {
	event.preventDefault();

	var touch = event.touches[ 0 ];
	touchX = touch.screenX;
	touchY = touch.screenY;
}

function onDocumentTouchMove(event) {
	event.preventDefault();

	var touch = event.touches[ 0 ];
	var x = touch.screenX - touchX;
	var y = touch.screenY - touchY;

	var mX = new THREE.Matrix4();
	mX.makeRotationX(y * 0.007);
	var mY = new THREE.Matrix4();
	mY.makeRotationY(x * 0.007);

	var m = new THREE.Matrix4();
	m.multiplyMatrices(mX, mY);

	var mQ = new THREE.Quaternion();
	mQ.setFromRotationMatrix(m);

	mQ.multiply(root.quaternion);
	root.quaternion.copy(mQ);

	touchX = touch.screenX;
	touchY = touch.screenY;
}

function degree_to_radians(degree) {
	return degree * (Math.PI / 180);
}