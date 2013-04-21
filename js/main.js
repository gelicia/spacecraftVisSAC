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

	d3.csv("data/locations.csv", function(collection) {
		map.selectAll("circle")
		.data(collection)
		.enter().append("svg:circle") 
		.attr({
			//"cy" : 100,
			//"cx" : 200,projection([d.lon, d.lat])[0]
			//"cy": function(d) { return mapHeight -proj([d.longitude, d.latitude])[0]; },
			//"cx": function(d) { return proj([d.longitude, d.latitude])[1]; },
			"transform" : function(d) {return "translate(" + proj([d.latitude,d.longitude]) + ")";},
			"r" : function(d) { return 3; },
			fill : '#3D89C4',
			stroke : "#000000",
			"id" : function(d) { return d.location; }
		}).moveToFront();
	});

	var countriesDS = new Miso.Dataset({
		url: "data/locations.csv",
		delimiter: ","
	});

	var countries = [];
	
	_.when(countriesDS.fetch({
		success: function(){
			this.each(function(row){
				countries.push(row.modernCountryCode);
			});
		}
	})).then(function(){
			countries = _.uniq(countries);
			console.log(countries);
			for (var i = 0; i < countries.length; i++) {
				d3.select("#" + countries[i])
				.transition()
				.duration(1000)
				.ease("linear")
				.attr({
					fill: '#666666'
				});
		}
	});


}