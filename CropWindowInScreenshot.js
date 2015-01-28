importClass(Packages.ij.IJ);

var minX = 80;
var minY = 66;

var backgroundGray = 0x74;
var innerGray = 0xe0;
var borderGray = 0x5e;

var roughlyEquals = function(a, b, tolerance) {
	return a > b - tolerance && b >= a - tolerance;
}

var findUpperLeft = function(ip) {
	var xStride = 8;
	var yStride = 4;

	var pixels = ip.getPixels();
	var width = ip.getWidth();
	var height = ip.getHeight();

	// find a stretch of inner grays
	var isGray = function(x, y, gray, tolerance) {
		var value = pixels[x + y * width];
		var red = (value >> 16) & 0xff;
		var green = (value >> 8) & 0xff;
		var blue = value & 0xff;

		return red == green && red == blue &&
			roughlyEquals(red, gray, tolerance);
	}

	for (var y0 = minY; y0 < height; y0 += yStride) {
		for (var x0 = minX; x0 < width; x0 += xStride) {
			if (!isGray(x0, y0, innerGray, 5)) continue;
			var x = x0, y = y0;
			while (isGray(x - 1, y, innerGray, 5)) x--;
			while (isGray(x - 1, y + 1, innerGray, 5)) {
				x--; y++;
			}
			if (isGray(x - 1, y, borderGray, 5) &&
					isGray(x - 2, y, backgroundGray, 9) &&
					isGray(x - 1, y - 5, backgroundGray, 5) &&
					isGray(x + 5, y - 5, borderGray, 5)) {
				y0 = height;
				break;
			}
		}
	}

	if (y >= height) {
		IJ.log("Not found!");
		return;
	}

	return [x - 1, y - 5];
};

var findLowerRight = function(ip, upperLeft) {
	var pixels = ip.getPixels();
	var width = ip.getWidth();
	var height = ip.getHeight();

	// find a stretch of inner grays
	var isGray = function(x, y, gray, tolerance) {
		var value = pixels[x + y * width];
		var red = (value >> 16) & 0xff;
		var green = (value >> 8) & 0xff;
		var blue = value & 0xff;

		return red == green && red == blue &&
			roughlyEquals(red, gray, tolerance);
	}

	var x = upperLeft[0] + 5;
	var y = upperLeft[1];

	while (isGray(x + 1, y, borderGray, 5)) x++;
	y += 5;
	if (isGray(x + 3, y, borderGray, 5)) x += 3;
	else if (isGray(x + 4, y, borderGray, 5)) x += 3;
	else {
		IJ.log("upper right not found!");
		return;
	}

	var isDarkerThanAbove = function(x, y) {
		var value = pixels[x + (y - 1) * width];
		var red0 = (value >> 16) & 0xff;
		var green0 = (value >> 8) & 0xff;
		var blue0 = value & 0xff;
		value = pixels[x + y * width];
		var red = (value >> 16) & 0xff;
		var green = (value >> 8) & 0xff;
		var blue = value & 0xff;
		return red <= red0 && green <= green0 && blue <= blue0;
	}

	while (y + 1 < height && isDarkerThanAbove(x, y + 1)) y++;

	var get = function(x, y) {
		var value = pixels[x + y * width];
		return (value >> 16) & 0xff;
	}

	var dark = get(x, y);
	if (isGray(x - 5, y + 5, dark, 9)) {
		return [x, y + 5];
	}
	y++;
	if (isGray(x - 5, y + 5, dark, 9)) {
		return [x, y + 5];
	}

	IJ.log("lower right not found!");
	return;
};

var image = IJ.getImage();
var ip = image.getProcessor();
var upperLeft = findUpperLeft(ip);
var lowerRight = findLowerRight(ip, upperLeft);

if (upperLeft && lowerRight) {
	importClass(Packages.java.awt.Rectangle);
	var roi = new Rectangle(upperLeft[0], upperLeft[1],
		lowerRight[0] - upperLeft[0] + 1,
		lowerRight[1] - upperLeft[1] + 1);
	image.setRoi(roi);
	
	IJ.run("Crop");
}