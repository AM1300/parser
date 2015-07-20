var fs = require('fs');
var S = require('string');
var _ = require('underscore');
var path = require('path');

var entry = {
	timestamp: '',
	prop1: 'value1',
	prop2: 'value2'
};



function getNumOfColumns(file) {

	var filePath = path.join(__dirname, 'files/' + file);
	// console.log(filePath);

	var data = fs.readFileSync(filePath, 'utf8');

	var lines = S(data).lines();

	// Lines containing the actual data
	var dataLines = _.reject(lines, function(line) {
		return /^\s*\#/.test(line);
	});

	var firstLine = dataLines[0];
	return firstLine.split(',').length - 1;
}

function getLines (file, currentCol, result, callback) {

	var propName = file.split('/').pop().split('.')[0];

	fs.readFile(file, 'utf8', function(err, data) {

		if (err) {
			return console.log(err);
		}

		var lines = S(data).lines();

		// Lines starting with #
		var metaLines = _.filter(lines, function(line) {
			// console.log(line)
			return /^\s*\#/.test(line);
		});

		// Lines containing the actual data
		var dataLines = _.reject(lines, function(line) {
			return /^\s*\#/.test(line);
		});

		// keyesString is the last line of the metaLines array (string)
		var keysString = metaLines[metaLines.length - 1];
		// keys is an array of all the keys (strings) returned by split
		var keys = keysString.split(',');

		keys = _.map(keys, function(key) {
			return key.replace(/\#|\s+/g, '');
		});

		var currentKey = keys[currentCol];

		for(var i=0; i<dataLines.length; i++) {
			var tokens = dataLines[i].split(',');
			var timestamp = tokens[0];
			var value = tokens[currentCol];
			value = parseFloat(value).toFixed(5);
			if (!value) {
				continue;
			}

			// console.log(timestamp, ' ', propName, ' ', value);
			var foundEntry = _.findWhere(result, {timestamp: timestamp});
			if (foundEntry) {
				foundEntry[currentKey] = value;
			}
			else {
				var newEntry = {};
				newEntry.timestamp = timestamp;
				newEntry[currentKey] = value;
				result.push(newEntry);
			}
		}

		callback(currentKey);
	});
}


function readAllFiles(files, currentColumn) {

	var result = [];
	var fileCount = files.length;
	var filesRead = 0;
	var outputFileName = 'results_col_' + currentColumn;

	files.forEach(function(f) {
		// console.log('Files: ' + fullPath);
		var fullPath = 'files' + '/' + f;

		getLines(fullPath, currentColumn, result, function(currentKey) {
			// All files are read (for 1 column)
			if(++filesRead === fileCount) {
				fs.writeFile(outputFileName + '.js', JSON.stringify(result), 'utf8', function(err) {
					if (err) throw err;
					// console.log('JSON saved!');
				});
				var csvResult = _.map(result, function(entry) {
					return _.values(entry).join(',');
				});

				// exctract device properties from key

				// na allaksw ta regex gia na vgalw energy sources ;)
				var devType = currentKey.match(/\D+(?=\d)/g)[0];
				var devId = currentKey.match(/\d+/g)[0];
				// var devPhase = currentKey.match(/\D+(?=\d)/g)[1].substr(0,1);
				var devNodeId = currentKey.match(/\d+/g)[1];
				var houseID = devPhase+devNodeId;

				console.log(
					'devType', devType,
					'devId', devId,
					'devPhase', devPhase,
					'devNodeId', devNodeId,
					'houseID', houseID);

				var outputFile = fs.createWriteStream(outputFileName + '.csv');
				outputFile.on('error', function(err) { /* error handling */ });
				csvResult.forEach(function(v) {
					var out = [];
					out.push(v);
					out.push(devType);
					out.push(devId);
					out.push(devPhase);
					out.push(houseID);
					// out.push(devNodeId);
					outputFile.write(out.join(',') + '\n');
				});
				outputFile.end();			// Go to next column
			}

			// readAllFiles(files, currentColumn++);
		});
	});
}

fs.readdir(__dirname + '/files', function(err, files) {
	if (err) return;

	// assuming all files have the same number of columns,
	// choose randomly the first and count its columns
	var numOfColumns = getNumOfColumns(files[0]);
	for(var i=0; i<numOfColumns; i++) {
		readAllFiles(files, i + 1);
	}
});
