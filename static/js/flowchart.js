
FlowChart = function(_parentElement) {
    this.parentElement = _parentElement;

    this.initVis();
}


FlowChart.prototype.initVis = function() {
    var vis = this;

    vis.margin = {top: 50, right: 30, bottom: 45, left: 30};
    vis.width = 900 - vis.margin.left - vis.margin.right;
    vis.height = 1000 - vis.margin.top - vis.margin.bottom;

    vis.svg = d3.select(vis.parentElement)
        .append("svg")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 1000 1200")
        // .attr("width", vis.width + vis.margin.left + vis.margin.right)
        // .attr("height", vis.height + vis.margin.top + vis.margin.bottom);

    vis.g = vis.svg.append("g")
        .attr("class", vis.parentGroupClass)
        .attr("id", "chart-data")
        .attr("transform",
              "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    vis.blockSize = 6;
    vis.blockSpacing = 1;
    vis.transitionDelay = 20;
    vis.blockGroupWidth = 35;
    vis.fullBlockWidth = vis.blockGroupWidth*(vis.blockSize + vis.blockSpacing);

    vis.color = d3.scaleOrdinal()
        .domain(["black", "white", "asian", "latino"])
        .range(["blue", "red", "green", "orange"])
        .unknown("gray")

    vis.dateText = d3.select("#date-display").append("text")
        .attr("class", "date-text")
        .attr("x", 0)
        .attr("y", 30)
        .attr("text-anchor", "start")
        .style("font-size", "18pt")
        .text(d3.timeFormat("%B %d, %Y")(currentDate))
        // {'black': 3312, 'white': 1027, '': 636, 'latino': 392, 'multiple complainants, different races': 101, 'asian': 96, 'other': 30, 'indian': 15, 'multi ethnic': 10, 'middle east': 2}

    vis.sortOrder = ["black", "white", "asian", "latino"];

    vis.outcomeCoordinates = {
        "Guilty Finding": [600,30],
        "No Guilty Findings": [600, 330],
        "Training/Counseling": [600, 150],
        "No Sustained Findings": [300, 150],
        "Sustained Finding": [300, 30],
        "Pending": [0, 150]
    }

    vis.outcomeCounts = {}

    for (let [key, value] of Object.entries(vis.outcomeCoordinates)) {
        vis.g.append("text")
            .attr("class", "group-label")
            .attr("x", value[0])
            .attr("y", value[1] - 30)
            .style("font-size", "12pt")
            .text(key)

        // vis.outcomeCounts[key] = vis.g.append("text")
        //                             .attr("class", "outcome-counts")
        //                             .attr("x", value[0] + vis.fullBlockWidth - 30)
        //                             .attr("y", value[1])
        //                             .style("font-size", "10pt")
        //                             .text("Outcome Counts Test")
    }

    vis.wrangleData();
}



FlowChart.prototype.wrangleData = function() {
    var vis = this;

    vis.dateText
        .text(d3.timeFormat("%B %d, %Y")(currentDate))

    vis.chartData = officerDisciplineResults.filter(function(d) {
        // Revisit this later
        return d.date_received <= currentDate && d.investigative_findings != "Not Applicable";
    })
    .sort(function(a, b) {
        return vis.sortOrder.indexOf(a.complainant_race) - vis.sortOrder.indexOf(b.complainant_race);
    });

    vis.initialOutcomeIndices = {
        "No Sustained Findings": 0,
        "Sustained Finding": 0,
        "Pending": 0
    }

    vis.finalOutcomeIndices = {
        "Guilty Finding": 0,
        "No Guilty Findings": 0,
        "Training/Counseling": 0,
        "No Sustained Findings": 0,
        "Pending": 0
    }

    vis.chartData.forEach(function(d) {
        d.initial_state_index = vis.initialOutcomeIndices[d.investigative_findings];
        vis.initialOutcomeIndices[d.investigative_findings] += 1

        d.final_state_index = vis.finalOutcomeIndices[d.end_state];
        vis.finalOutcomeIndices[d.end_state] += 1
    })


    console.log(vis.chartData);

    
    this.updateVis();
}


FlowChart.prototype.updateVis = function() {
    var vis = this;

    // JOIN data with any existing elements
    vis.flowchart = vis.g
        .selectAll("rect")
        .data(vis.chartData , function(d) {
            return d.officer_complaint_id;
        })


    // EXIT old elements not present in new data (this shouldn't be the case)
    vis.flowchart
        .exit()
            .remove()

    var newElementIndex = 0;
    vis.flowchart.enter().each(function(d) {
        if (d.investigative_findings == "Sustained Finding") {
            d.enter_index = newElementIndex;
            newElementIndex += 1
        }
    })

    // ENTER new elements present in the data...
    vis.flowchart
        .enter()
            .append("rect")
                .attr("class", "complaint-box")
                .style("opacity", 0.8)
                .attr("y", 0)
                .attr("x", 0)
                .attr("height", vis.blockSize)
                .attr("width", vis.blockSize)
                .attr("fill", function(d) {
                    return vis.color(d.complainant_race);
                })
                .transition()
                    // .delay(function(d,i) {
                    //     return vis.transitionDelay*i;
                    // })
                    .duration(300)
                    .attr("opacity", 1)
                    .attr("x",  function(d,i) {
                        if (d.investigative_findings == "Sustained Finding") {
                            var coordinateIndex = d.enter_index
                        }
                        else {
                            var coordinateIndex = d.initial_state_index;
                        }
                        return vis.outcomeCoordinates[d.investigative_findings][0] + (vis.blockSize + vis.blockSpacing)*((coordinateIndex%vis.blockGroupWidth));
                    })
                    .attr("y", function(d,i) {
                        if (d.investigative_findings == "Sustained Finding") {
                            var coordinateIndex = d.enter_index
                        }
                        else {
                            var coordinateIndex = d.initial_state_index;
                        }
                        return vis.outcomeCoordinates[d.investigative_findings][1] + (vis.blockSize + vis.blockSpacing)*Math.floor(1.0*coordinateIndex/vis.blockGroupWidth);
                    })
                    .transition()
                        .duration(300)
                        .delay(400)
                        .attr("x",  function(d,i) {
                            return vis.outcomeCoordinates[d.end_state][0] + (vis.blockSize + vis.blockSpacing)*((d.final_state_index%vis.blockGroupWidth));
                        })
                        .attr("y", function(d,i) {
                            return vis.outcomeCoordinates[d.end_state][1] + (vis.blockSize + vis.blockSpacing)*Math.floor(1.0*(d.final_state_index)/vis.blockGroupWidth);
                        })
                    
    vis.flowchart
        .transition()
            .duration(300)
            .delay(function(d) {
                if (d.investigative_findings == "Sustained Finding") {
                    return 700;
                }
                else {
                    return 0;
                }
            })
                .attr("x",  function(d,i) {
                    return vis.outcomeCoordinates[d.end_state][0] + (vis.blockSize + vis.blockSpacing)*((d.final_state_index%vis.blockGroupWidth));
                })
                .attr("y", function(d,i) {
                    return vis.outcomeCoordinates[d.end_state][1] + (vis.blockSize + vis.blockSpacing)*Math.floor(1.0*(d.final_state_index)/vis.blockGroupWidth);
                })
                    
}


FlowChart.prototype.setToolTips = function() {
    var vis = this;

    vis.tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function(d) {

            var areaName = d.city;
            var playerCount = d.players;
            var tipUnit = "City";

            if(currentProperty == 'num_all_stars') {
                var playerUnit = 'All-Stars'
            }
            else {
                var playerUnit = 'NBA Players'
            }

            if (d.population == null || d.population == 0) {
                var displayPopulation = 'N/A'
                var displayDensity = 'N/A'
            }
            else {
                var displayPopulation = d3.format(',')(d.population);
                var displayDensity = d3.format('.1f')(d.per_capita);
            }

            var tipText = "<strong>" + tipUnit + ": </strong><span class='details'>" + areaName + "<br><br></span>"
            tipText += "<strong>Population: </strong><span class='details'>" + displayPopulation + "<br></span>";
            tipText += "<strong>" + playerUnit + ": </strong><span class='details'>" + playerCount + "<br></span>";
            tipText += "<strong>" + playerUnit + "/100,000 People: </strong><span class='details'>" + displayDensity + "</span>";

            if (phoneBrowsing == true) {
                infoBoxActive = true;

                infoBoxSelection = d;
                infoBoxMapUnit = 'cities';

                tipText += '<br><br><div id="pop-up-player-info-text" style="overflow-y:auto;"></div>';
            }
            return tipText;
        })

    vis.svg.call(vis.tip);
    for (let [key, value] of Object.entries(vis.outcomeCoordinates)) {
        vis.g.append("text")
            .attr("class", "group-label")
            .attr("x", value[0])
            .attr("y", value[1] - 30)
            .style("font-size", "12pt")
            .text(key)
    }

}

