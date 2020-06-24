
Sunburst = function(_parentElement) {
    this.parentElement = _parentElement;

    this.initVis();
}

Sunburst.prototype.initVis = function() {
    var vis = this;

    // Dimensions of sunburst.
    vis.margin = {'top': 50, 'bottom': 10, 'left': 10, 'right': 10}
    vis.width = 800 - vis.margin.left - vis.margin.right;
    vis.height = 800 - vis.margin.top - vis.margin.bottom;
    vis.radius = Math.min(vis.width, vis.height) / 2;

    vis.arc = d3.arc()
        .startAngle(function(d) {
            d.x0s = d.x0;
            return d.x0;
        })
        .endAngle(function(d) {
            d.x1s = d.x1;
            return d.x1;
        })
        .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
        .padRadius(vis.radius / 2)
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1 - 1)


    vis.partition = data => d3.partition()
        .size([2 * Math.PI, vis.radius])
            (d3.hierarchy(vis.data)
        .sum(d => d.value))
        // .sort((a, b) => b.value - a.value))

    vis.svg = d3.select(vis.parentElement)
        .append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom)

    vis.g = vis.svg.append("g")
        .attr("transform", "translate(" + vis.margin.left + ", " + vis.margin.top + ")");

    vis.labelGroup = vis.g.append("g")
        .attr("pointer-events", "none")
        .attr("text-anchor", "middle")
        .attr("font-size", 11)

    vis.previousAngles = {};

    vis.format = d3.format(",d")

    vis.selectedValPct = vis.g.append("text")
        .attr("transform", "translate(" + vis.radius + "," + vis.radius + ")")
        .attr("text-anchor", "middle")
        .style("font-size", "20pt")
        .style("fill-opacity", 0.6)
        .text("")

    vis.selectedValTotals = vis.g.append("text")
        .attr("transform", "translate(" + vis.radius + "," + vis.radius + ")")
        .attr("text-anchor", "middle")
        .attr("dy", 22)
        .style("font-size", "9pt")
        .style("fill-opacity", 0.6)
        .text("")

    $('.sunburst-select').on('change', function(e) {
        vis.wrangleData();
    })

    vis.wrangleData();
}

Sunburst.prototype.wrangleData = function() {
    let vis = this;

    vis.chartData = officerDisciplineResults;

    ['po', 'complainant'].forEach(function(category) {
        let itemSelect = $(`#sunburst-${category}-race`).val();

        if (itemSelect === 'other') {
            vis.chartData = vis.chartData
                .filter(function(d) {
                    return d[`${category}_race`] !== 'white' && d[`${category}_race`]  !== 'latino' && d[`${category}_race`]  !== 'black';
                })
        }
        else if (itemSelect !== 'all') {
            vis.chartData = vis.chartData
                .filter(function(d) {
                    return d[`${category}_race`] === itemSelect;
                })
        }
    });

    vis.totalSize = vis.chartData.length;

    var nest = d3.nest()
        .key(function(d) {return d.investigative_findings})
        .map(vis.chartData);

    var investigative_result_counts = [];
    ["Sustained Finding", "No Sustained Findings", "Investigation Pending"].forEach(function(i_key) {

        if (i_key === "Sustained Finding" && nest.get("Sustained Finding") !== undefined) {
            var subnest = d3.nest()
                .key(function(d) {return d.disciplinary_findings})
                .map(nest.get(i_key))

            var disciplinary_result_counts = [];
            ["Guilty Finding", "Training/Counseling", "No Guilty Findings", "Discipline Pending"].forEach(function(d_key) {
                if (subnest.get(d_key) !== undefined) {
                    disciplinary_result_counts.push({'name': d_key, 'value': subnest.get(d_key).length})
                }
            })

            investigative_result_counts.push({'name': i_key, 'children': disciplinary_result_counts})
        }
        else {
            if (nest.get(i_key) !== undefined) {
                investigative_result_counts.push({'name': i_key, 'value': nest.get(i_key).length})
            }
        }
    })

    vis.data = {'name': 'investigative_results', 'children': investigative_result_counts}

    vis.root = vis.partition(vis.data);

    vis.updateVis();

}

// Main function to draw and set up the visualization, once we have the data.
Sunburst.prototype.updateVis = function() {
    var vis = this;

    vis.plotAreas = vis.g.selectAll("path")
        .data(vis.root.descendants().filter(function(d) {
                return d.depth
            }),
            function(d) {
                return d.data.name;
            })

    vis.plotAreas
        .enter()
        .append("path")
        .attr("parent", function(d) {
            if(d.depth > 1) {
                return d.parent.data.name.replace(" ", "-");
            }
            else {
                return d.data.name;
            }
        })
        .attr("class", function(d) {
            if(d.depth > 1) {
                return "sunburst-segment child";
            }
            else {
                return "sunburst-segment parent " + d.data.name.replace(" ", "-");
            }
        })
        .attr("fill", function(d) {
            // while (d.depth > 1)
            //     d = d.parent;
            return outcomeColors(d.data.name);
        })
        .attr("d", function(d) {
            var test = vis.arc(d)
            return test;
        })
        .attr("fill-opacity", 0.6)
        .on("mouseover", function(d,i,n) {
            $("#sunburst-area path").removeAttr('style');
            vis.mouseover(d,i,n);
        })
        .on("mouseout", function() {
            vis.mouseout();
        })
        .attr("transform", "translate(" + vis.radius + "," + vis.radius + ")")
        .each(function(d) {
            vis.previousAngles[d.data.name]  = {'x0': d.x0, 'x1': d.x1};
        })

    vis.plotAreas
        .exit()
        .remove();

    vis.plotAreas
        .transition()
            .delay(0)
            .duration(1000)
            .ease(d3.easePoly)
            .attrTween("d", arcTweenPath);

    vis.labels = vis.labelGroup.selectAll("text")
        .data(vis.root.descendants().filter(d => d.depth && (d.y0 + d.y1) / 2 * (d.x1 - d.x0) > 10))

    vis.labels
        .enter()
        .append("text")
        .attr("transform", function(d) {
            const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
            const y = (d.y0 + d.y1) / 2;
            return `translate(${vis.radius}, ${vis.radius}) rotate(${x - 90}) translate(${y},0) rotate(${90 - x}) rotate(${90-x < 180 ? 0 : 180})`;
        })
        .attr("dy", "0.35em")
        // .style("fill", "black")
        // .style("stroke", "black")
        // .style("stroke-width", 1.5)
        .text(d => d.data.name);

    vis.labels
        .transition()
        .delay(0)
        .duration(1000)
        .ease(d3.easePoly)
        .attr("transform", function(d) {
            console.log(d);
            const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
            const y = (d.y0 + d.y1) / 2;
            return `translate(${vis.radius}, ${vis.radius}) rotate(${x - 90}) translate(${y},0) rotate(${90 - x}) rotate(${90-x < 180 ? 0 : 180})`;
        })

    vis.labelGroup.raise();

    function arcTweenPath(a, i) {

        var oi = d3.interpolate({ x0: vis.previousAngles[a.data.name].x0, x1: vis.previousAngles[a.data.name].x1}, a);

        function tween(t) {
            var b = oi(t);
            a.x0s = b.x0;
            a.x1s = b.x1;
            return vis.arc(b);
        }

        vis.previousAngles[a.data.name].x0 = a.x0;
        vis.previousAngles[a.data.name].x1 = a.x1;

        return tween;
    }

}

// Restore normal opacity levels and clear center text
Sunburst.prototype.mouseout = function() {
    var vis = this;

    $(".sunburst-segment").attr("fill-opacity", 0.6)

    vis.selectedValPct
        .text("");
    vis.selectedValTotals
        .text("");
}

// Fade all but the current sequence, and display center text
Sunburst.prototype.mouseover = function(d, i, n) {
    var vis = this;

    $(".sunburst-segment").attr("fill-opacity", 0.2);

    vis.selectedValPct
        .text(d3.format(".1%")(d.value/vis.totalSize));

    vis.selectedValTotals
        .text(`(${d.value} of ${vis.totalSize} investigations)`)

    var parentName = $(n[i]).attr("parent");

    $(n[i]).attr("fill-opacity", 0.8);
    $("." + parentName).attr("fill-opacity", 0.8);

}