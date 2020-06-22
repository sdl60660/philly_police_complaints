
DistrictMap = function(_parentElement) {

    this.parentElement = _parentElement;

    this.initVis();
}

DistrictMap.prototype.initVis = function() {
    var vis = this;

    vis.mapCenter = d3.geoCentroid(districtGeoJSON);

    vis.width = 600
    vis.height = 800

    vis.projection = d3.geoMercator()
        .scale(vis.width * 40)
        .center(vis.mapCenter)
        .translate([vis.width / 2, vis.height / 2])
        .fitSize([vis.width, vis.height], districtGeoJSON )


    vis.svg = d3.select("#map-area")
        .append("svg")

    vis.svg
        .attr("width", vis.width)
        .attr("height", vis.height)
        .attr("preserveAspectRatio", "xMinYMin meet")

    vis.g = vis.svg
        .append('g')
            .attr('class', 'map');

    // var tip = d3.tip()
    //     .attr('class', 'd3-tip')
    //     .html(function(d) {
    //         var text = "<span style='color:white'><strong>Organization</strong>: " + d.Organization + "</span></br></br>";
    //         text += "<span style='color:white'><strong>Address</strong>: " + d.Address + "</span></br>";
    //         text += "<span style='color:white'><strong>Looking For</strong>: " + d["Looking for"] + "</span></br></br>";
    //
    //         text += "<span style='color:white'><strong>Email</strong>: " + d.Email + "</span></br>";
    //         text += "<span style='color:white'><strong>Donation Link</strong>: " + d["Donation Link"] + "</span></br>";
    //         // text += "<span style='color:white'><strong>Address</strong>: " + d.Address + "</span></br>";
    //         return text;
    // })
    // g.call(tip);

    // g.on("click tap", function() {
    //     if (tipVisible == true) {
    //         tip.hide();
    //         tipVisible = false;
    //     }
    // })

    vis.path = d3.geoPath()
        .projection(vis.projection)


    vis.wrangleData();
}

DistrictMap.prototype.wrangleData = function() {
    var vis = this;




    vis.updateVis();
}

DistrictMap.prototype.updateVis = function() {
    var vis = this;

    vis.mapPath = vis.g.append("g")
        .attr("class", "city-map")
        .selectAll("path")
        .data( districtGeoJSON.features );

    vis.mapPath
        .enter()
        .append("path")
            .attr("d", vis.path)
            .attr("class", "neighborhood")
            // .attr("default-stroke", 0.3)
            .style("fill-opacity", 0.4)
            .style("stroke","black")
            .style('stroke-width', 0.3)
            .style("fill", function(d) {
                // console.log(d);
                return "blue";
            })


}
