d3.selection.prototype.moveToFront = function() {
	return this.each(function() {
		this.parentNode.appendChild(this);
	});
}; 

function init(){
	var loadDataPromise = loadDataset();
	loadDataPromise.done(drawMap());

}

function loadDataset(){
	var deferred = $.Deferred();

	deferred.resolve();
	return deferred.promise();
}

function drawMap(){
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

	var geoJson = d3.json("data/map.geojson", function(collection) {
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
	});

	var countriesDS = new Miso.Dataset({
		url: "data/locations.csv",
		delimiter: ","
	});

	var countries = [];
	
	_.when(countriesDS.fetch({
		success: function(){
			this.each(function(row){
				var countryInfo = {};
				countryInfo.modernCountryCode = row.modernCountryCode;
				countryInfo.longitude = row.longitude;
				countryInfo.latitude = row.latitude;
				countries.push(countryInfo);
			});
		}
	})).then(function(){
			//the shorthand doesn't work
			var uniqCC = _.uniq(_.pluck(countries, 'modernCountryCode'));

			//I'm so sorry.
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
				"r" : function(d) { return 3; },
				fill : '#3D89C4',
				stroke : "#000000",
				"id" : function(d) { return d.location; }
			});
	});
}