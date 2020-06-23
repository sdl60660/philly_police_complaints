

IntroText = function(_parentElement) {
    this.parentElement = _parentElement;
    this.initVis();
}

IntroText.prototype.initVis = function() {
    var vis = this;

    d3.select(vis.parentElement)
        .select("svg").remove();

    vis.svg = d3.select(vis.parentElement)
                .append("svg")
                .attr("preserveAspectRatio", "xMinYMin meet")
            	.attr("width", "100%")
            	.attr("height", "100%")

    vis.svg.append("text")
        .attr("x", 0)
        .attr("y", 20)
        .style("stroke", "black")
        .style("font-size", "14pt")
        .html("Since 2013, _____ complaints have been filed against Philadelphia police officers, resulting in ____ disciplinary investigations")

}

