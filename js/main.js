/*
click to show list of launches from that location
show data from that launch
*/

d3.selection.prototype.moveToFront = function() {
	return this.each(function() {
		this.parentNode.appendChild(this);
	});
}; 

var countries = [];
//initialize this once so we don't have to build it every time
var dates = [];

function init(){
	var buildDatePromise = buildDateList();
	buildDatePromise.done(
		function(){
			drawMapAndPoints();
		}
	);
}

function datePickerChanged(){
	var dateIn = new Date($('input[id=datepicker]').val());
	//getMonth is zero based, life is not
	var month = dateIn.getMonth() + 1;
	month = month.toString().length == 1 ? '0' + month.toString() : month.toString();
	var day = dateIn.getDate().toString().length == 1 ? '0' + dateIn.getDate().toString() : dateIn.getDate().toString();

	var mathDate = Number(dateIn.getFullYear().toString() + month + day);

	var launchBirthdayPromise = returnLaunchInfoByBirthday(mathDate);
		launchBirthdayPromise.done(
			function(result){
				writeSpaceInfoOut(mathDate, result);
			}
		);

}

function writeSpaceInfoOut(date, data){

	var container = d3.selectAll("#birthdayInfo");
	container.selectAll("*").remove();

	if (data.difference === 0){
		container.append("h3")
			.text("You have a birthday spacecraft!");
	}
	else if (data.difference < 365) {
		var priority = "before";
		if (date < data.date){
			priority = "after";
		}
		var plural = data.difference > 1 ? "s " : " ";

		container.append("h3")
			.text("You don't have a birthday spacecraft, but the closest was launched " + data.difference + " day" + plural + priority + " your birthday!");

		for (var i = 0; i < data.launchInfo.length; i++) {
			//print info
			container.append("p")
				.text(
					data.launchInfo[i].Name + " (" + data.launchInfo[i].NSSDC +  ") was launched from " + 
					data.launchInfo[i].LaunchLoc + ", " + data.launchInfo[i].LaunchCountry +
					" on " + data.launchInfo[i].LaunchDate  + " "
					).append("a")
				.attr({
					"href" : "http://nssdc.gsfc.nasa.gov" + data.launchInfo[i].URL 
				})
				.text("(More Info)");
		
			//highlight launch site
			var map = d3.select("#map");

			map.selectAll("circle")
				.attr({
					"fill" : "#3D89C4"
				});


			//var match = _.where(countries, {location: data.launchInfo[i].LaunchLoc, country: data.launchInfo[i].LaunchCountry});
			//console.log(match);
		}
	}
}

//birthday needs to be YYYYMMDD
//this quick searches through the loop for a match, finds the closest
//will return launch data
function returnLaunchInfoByBirthday(birthday){
	var def = $.Deferred();

	var minDate = Math.min.apply(null, dates);
	var maxDate = Math.max.apply(null, dates);
	var closestDate;
	var result = {date: 0, difference: 365};
	if (birthday < minDate){
		result.date = minDate;
		result.difference = Math.abs(minDate - birthday);
	}
	else if (birthday > maxDate){
		result.date = maxDate;
		result.difference = Math.abs(maxDate - birthday);
	}
	else {
		for (var i = 0; i < dates.length; i++) {
			var diff = Math.abs(dates[i] - birthday);
			if (diff < result.difference){
				result.date = dates[i];
				result.difference = diff;

				if (diff===0){ //if you find an exact match, stop looking
					break;
				}
			}
		}
	}

	//we don't want to do this search unless the difference isn't ridiculous
	if (result.difference < 365){
		//date is setup with diff above, get whatever the closest was
		var launchByDatePromise = returnLaunchInfoByDate(result.date);
		launchByDatePromise.done(
			function(resultIn){
				result.launchInfo = resultIn;
				def.resolve(result);
			}
		);
	}
	else {
		def.resolve(result);
	}

	return def.promise();
}

//dateIn needs to be YYYYMMDD
//this assumes that the dateIn will have launch info
function returnLaunchInfoByDate(dateIn){
	var def = $.Deferred();
	var launchInfoOut = [];

	var spaceCraft = new Miso.Dataset({
		url: "data/spacecraft.csv",
		delimiter: ","
	});

	_.when(spaceCraft.fetch({
		success: function(){
			this.each(function(row){
				var dateNum = Number(row.LaunchDate.replace(/-/g, ""));
				if( dateNum == dateIn){
					launchInfoOut.push(row);
				}
			});
		}
	})).then(function(){
		def.resolve(launchInfoOut);
	});

	return def.promise();
}

function getLocationFromCoord(long, lat){
	var match = _.where(countries, {longitude: long, latitude: lat});
	var locOut = match[0].location;
	locOut =  locOut + " (" + _.pluck(match, 'country').toString() + ")";
	return locOut;
}

function buildDateList(){
	var def = $.Deferred();

	var spaceCraft = new Miso.Dataset({
		url: "data/spacecraft.csv",
		delimiter: ","
	});

	_.when(spaceCraft.fetch({
		success: function(){
			this.each(function(row){
				if (row.LaunchDate != '0000-00-00'){
					dates.push((row.LaunchDate).toString());
				}
			});
		}
	})).then(function(){
		//make comparisons easier with a purely numeric date
		dates = _.uniq(dates.map(function(d){return Number(d.replace(/-/g, ""));}));
		def.resolve();
	});

	return def.promise();
}

//just drawing the map with geojson
function drawMap(map, path){
	var def = $.Deferred();
	
	d3.json("data/map.geojson", function(collection) {
		map.selectAll("path")
		.data(collection.features)
		.enter()
		.append("path")
		.attr({
			"d" : path,
			fill : "#C8C8C8", 
			stroke : "#000000",
			id : function(d) {return d.id;},
			"title" : function(d) {return (d.properties.name);}
		});

		def.resolve();
	});

	return def.promise();
}

//includes drawing the map and the points on top, with shading for countries with launch sites
function drawMapAndPoints(){
	var mapWidth = 960;
	var mapHeight = 600;

	var proj = d3.geo.winkel3().scale(182).translate([mapWidth / 2, mapHeight / 2]);
	var path = d3.geo.path().projection(proj);

	// Create the states variable
	var map = d3.select("#map")
			.attr({
			width : mapWidth,
			height: mapHeight,
			style : 'display:block; margin:auto;'
		})
		.append("g");

	var drawPromise  = drawMap(map, path);
	
	drawPromise.done(
		function(){
			var countriesDS = new Miso.Dataset({
				url: "data/locations.csv",
				delimiter: ","
			});
			
			_.when(countriesDS.fetch({
				success: function(){
					this.each(function(row){
						var countryInfo = {};
						countryInfo.modernCountryCode = row.modernCountryCode;
						countryInfo.longitude = row.longitude;
						countryInfo.latitude = row.latitude;
						countryInfo.location = row.location;
						countryInfo.country = row.country;
						countries.push(countryInfo);
					});
				}
			})).then(function(){
					//the shorthand doesn't work
					var uniqCC = _.uniq(_.pluck(countries, 'modernCountryCode'));

					//Get just the longitude and latitude from the countries, then return them uniquely by concatinating them together
					var uniqLongLat = _.uniq(countries.map(function(d){return [d.longitude, d.latitude];}), function(d){return d[0]+" " + d[1];});

					for (var i = 0; i < uniqCC.length; i++) {
						d3.select("#" + uniqCC[i])
						.transition()
						.duration(1000)
						.ease("linear")
						.attr({
							fill: '#666666'
						});
					}

					map.selectAll("circle")
					.data(uniqLongLat)
					.enter().append("svg:circle") 
					.attr({
						"transform" : function(d) {return "translate(" + proj([d[1],d[0]]) + ")";},
						"r" : function(d) { return 4; },
						fill : '#3D89C4',
						stroke : "#000000",
						"id" : function(d) { return d[1] + "x" + d[0] ; },
						"title" : function(d) { return getLocationFromCoord(d[0],d[1]) ; }
					});
			});
		}
	);
}