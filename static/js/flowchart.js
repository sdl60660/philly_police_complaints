const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function formatSpacedStrings(str) {
    return str.replace(/ /g, '-').replace(/\//g, '-');
}

FlowChart = function(_parentElement) {
    this.parentElement = _parentElement;

    this.initVis();
}


FlowChart.prototype.initVis = function() {
    var vis = this;

    vis.margin = {top: 120, right: 30, bottom: 45, left: 30};
    vis.width = 1000 - vis.margin.left - vis.margin.right;
    vis.height = 1300 - vis.margin.top - vis.margin.bottom;

    vis.svg = d3.select(vis.parentElement)
        .append("svg");
        // .attr("width", 1000)
        // .attr("height", 1500)

    if(phoneBrowsing) {
        vis.svg
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom);

    }
    else {
        vis.svg
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 1000 1500")
    }


    vis.g = vis.svg.append("g")
        .attr("class", vis.parentGroupClass)
        .attr("id", "chart-data")
        .attr("transform",
              "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    vis.blockSize = 5;
    vis.blockSpacing = 1;
    vis.trueBlockWidth = (vis.blockSize + vis.blockSpacing);
    vis.transitionDelay = 20;
    vis.blockGroupWidth = 45;
    vis.fullBlockWidth = vis.blockGroupWidth*vis.trueBlockWidth;

    vis.representedVals = ["black", "white", "latino"];
    vis.color = d3.scaleOrdinal()
        .domain(vis.representedVals)
        .range(["blue", "red", "orange"])
        .unknown("gray")

    vis.startDateText = d3.select("#start-date-display").append("text")
        .attr("class", "date-display")
        .attr("x", 0)
        .attr("y", 30)
        .attr("text-anchor", "start")
        .style("font-size", "14px")
        .text(d3.timeFormat("%B %Y")(startRange))
    vis.endDateText = d3.select("#end-date-display").append("text")
        .attr("class", "date-display")
        .attr("x", 0)
        .attr("y", 30)
        .attr("text-anchor", "start")
        .style("font-size", "14px")
        .text(d3.timeFormat("%B %Y")(endRange))

    vis.reverseSortOrder = ["asian", "latino", "white", "black"];

    var col1x = 100;
    var col2x = 500;

    vis.outcomeCoordinates = {
        
        "Sustained Finding": [col1x, 30],
        "Investigation Pending": [col1x, 190],
        "No Sustained Findings": [col1x, 390],

        "Guilty Finding": [col2x, 30],
        "Training/Counseling": [col2x, 190],
        "No Guilty Findings": [col2x, 390],
        "Discipline Pending": [col2x, 550]
    }

    vis.outcomeLabels = {}
    vis.outcomeCounts = {}

    for (let [key, value] of Object.entries(vis.outcomeCoordinates)) {
        var outcomeLabel = vis.g.append("text")
            .attr("class", "group-label " + formatSpacedStrings(key))
            .attr("x", value[0])
            .attr("y", value[1] - 30)
            // .style("font-size", "12pt")
            .text(key)

        // var svgW
        var labelWidth = outcomeLabel.node().getBBox().width + outcomeLabel.node().getBBox().x;

        vis.outcomeLabels[key] = outcomeLabel;
        vis.outcomeCounts[key] = vis.g.append("text")
                                    .attr("class", "outcome-counts " + formatSpacedStrings(key))
                                    .attr("x", labelWidth - 10)
                                    .attr("y", value[1] - 60)
                                    .attr("text-anchor", "start")
                                    .style("font-size", "7pt")
                                    .text("")
    }

    vis.incidentTypes = ['Departmental Violations', 'Lack Of Service', 'Physical Abuse',  'Verbal Abuse','Unprofessional Conduct', 'Criminal Allegation', 'Harassment','Civil Rights Complaint','Domestic', 'Falsification', 'Sexual Crime/Misconduct','Drugs']
    vis.setComplaintTypes();

    vis.wrangleData();
}



FlowChart.prototype.wrangleData = function() {
    var vis = this;

    vis.chartData = officerDisciplineResults.filter(function(d) {
        return d.date_received >= startRange && d.date_received <= endRange;
    })

    vis.updateComplaintTypes();

    vis.chartData = vis.chartData.filter(function(d) {
        // Revisit this later
        return vis.selectedComplaintTypes.includes(d.general_cap_classification);
    })
    .sort(function(a, b) {
        return vis.reverseSortOrder.indexOf(b.complainant_race) - vis.reverseSortOrder.indexOf(a.complainant_race);
    });

    vis.initialOutcomeIndices = {
        "No Sustained Findings": 0,
        "Sustained Finding": 0,
        "Investigation Pending": 0
    }

    vis.finalOutcomeIndices = {
        "Guilty Finding": 0,
        "No Guilty Findings": 0,
        "Training/Counseling": 0,
        "No Sustained Findings": 0,
        "Discipline Pending": 0,
        "Investigation Pending": 0
    }


    vis.chartData.forEach(function(d) {
        d.initial_state_index = vis.initialOutcomeIndices[d.investigative_findings];
        vis.initialOutcomeIndices[d.investigative_findings] += 1

        d.final_state_index = vis.finalOutcomeIndices[d.end_state];
        vis.finalOutcomeIndices[d.end_state] += 1
    })



    vis.setToolTips();
    vis.updateVis();
}


FlowChart.prototype.updateVis = function() {
    var vis = this;

    // JOIN data with any existing elements
    vis.flowchart = vis.g
        .selectAll("rect")
        .data(vis.chartData , function(d) {
            return d.discipline_id;
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
                // .attr("y", function(d) {
                //     return 220 + d.enter_index * vis.trueBlockWidth;
                // })
                .attr("y", 220)
                .attr("x", 10)
                .attr("height", vis.blockSize)
                .attr("width", vis.blockSize)
                .attr("fill", function(d) {
                    return vis.color(d.complainant_race);
                })
                .on("mouseover", vis.tip.show)
                .on("mouseout", vis.tip.hide)
                .transition()
                    .delay(100)
                    .duration(300)
                    .attr("opacity", 1)
                    .attr("x",  function(d,i) {

                        if (d.investigative_findings == "Sustained Finding") {
                            var coordinateIndex = d.enter_index
                        }
                        else {
                            var coordinateIndex = d.initial_state_index;
                        }

                        return vis.outcomeCoordinates[d.investigative_findings][0] + vis.trueBlockWidth * (coordinateIndex%vis.blockGroupWidth);
                    })
                    .attr("y", function(d,i) {

                        if (d.investigative_findings == "Sustained Finding") {
                            var coordinateIndex = d.enter_index
                        }
                        else {
                            var coordinateIndex = d.initial_state_index;
                        }

                        return vis.outcomeCoordinates[d.investigative_findings][1] + vis.trueBlockWidth * Math.floor(coordinateIndex/vis.blockGroupWidth);
                    })
                    .transition()
                        .duration(300)
                        .delay(400)
                        .attr("x",  function(d,i) {
                            return vis.outcomeCoordinates[d.end_state][0] + vis.trueBlockWidth * (d.final_state_index%vis.blockGroupWidth);
                        })
                        .attr("y", function(d,i) {
                            return vis.outcomeCoordinates[d.end_state][1] + vis.trueBlockWidth * Math.floor(d.final_state_index/vis.blockGroupWidth);
                        })
                    
    vis.flowchart
        .transition()
            .duration(300)
            .delay(function(d) {

                if (d.investigative_findings == "Sustained Finding") {
                    return 800;
                }
                else {
                    return 100;
                }
            })
                .attr("x",  function(d,i) {
                    return vis.outcomeCoordinates[d.end_state][0] + vis.trueBlockWidth * (d.final_state_index%vis.blockGroupWidth);
                })
                .attr("y", function(d,i) {
                    return vis.outcomeCoordinates[d.end_state][1] + vis.trueBlockWidth * Math.floor(1.0*(d.final_state_index)/vis.blockGroupWidth);
                })

    sleep(1100).then(() => {
        vis.updateCounts();
        // vis.setPathArrows();
    })


}

FlowChart.prototype.setPathArrows = function() {
    var vis = this;


    var svgCoordinates = vis.svg.node().getBBox();
    var start = vis.svg.select('.outcome-counts.Sustained-Finding').node().getBBox();

    var disciplinaryOutcomes = ["Guilty Finding", "Training/Counseling", "No Guilty Findings", "Discipline Pending"]
    disciplinaryOutcomes.forEach(function(outcome) {
        var end = vis.svg.select('.group-label.' + formatSpacedStrings(outcome)).node().getBBox();

        var curve = d3.line().curve(d3.curveNatural);
        var points = [[start.x + 2*(start.width), (svgCoordinates.y + (start.y + start.height)/2)], [end.x , (svgCoordinates.y + (end.y + end.height))]]

        // console.log(vis.svg.attr("x"), vis.svg.attr("y"))
        // console.log(vis.svg.select('.outcome-counts.Sustained-Finding').attr("x"), vis.svg.select('.outcome-counts.Sustained-Finding').attr("y"))
        // console.log(start, end);
        // console.log(points);
        vis.svg
            .append('path')
            .attr('d', curve(points))
            .attr('stroke', 'black')
            // with multiple points defined, if you leave out fill:none,
            // the overlapping space defined by the points is filled with
            // the default value of 'black'
            .attr('fill', 'none');
    })


}

FlowChart.prototype.updateCounts = function() {
    var vis = this;

    Object.keys(vis.outcomeCoordinates).forEach(function(outcome) {
        var outputString = '';
        var labelX = vis.outcomeLabels[outcome].node().getBoundingClientRect().width + vis.outcomeCoordinates[outcome][0];

        var stateVar = 'end_state'
        if (outcome == 'Sustained Finding') {
            stateVar = 'investigative_findings';
        }

        vis.representedVals.forEach(function(group) {
            var groupCount = vis.chartData.filter(function(d) {
                return d[stateVar] == outcome && d.complainant_race == group;
            }).length
            
            var groupTotal = vis.chartData.filter(function(d) {
                return d.complainant_race == group;
            }).length
            // var groupTotal = vis.finalOutcomeIndices[outcome]

            if (groupTotal > 0) {
                var percentageVal = ' (' + d3.format('.1f')(100 * (groupCount / groupTotal)) + '%)';
            }
            else {
                var percentageVal = '';
            }

            outputString += '<tspan x=' + labelX + ' style="fill:' + vis.color(group) + ';" dy="1.2em">' + group + ': ' + groupCount + '/' + groupTotal + percentageVal + '</tspan>';
        })
        vis.outcomeCounts[outcome]
            .html(outputString);
    })
}


FlowChart.prototype.setComplaintTypes = function() {
    var vis = this;

    // vis.chartData.map(function(a) {return a.general_cap_classification})

    vis.incidentTypes.forEach(function(complaintName) {
        $("select#incident-type-select")
            .append('<option selected id="' + formatSpacedStrings(complaintName) + '" name="' + complaintName + '" value="' + complaintName + '">' + complaintName + '</option><br>');
    })

    $(".chosen-select")
        .chosen()

}


FlowChart.prototype.updateComplaintTypes = function() {
    var vis = this;

    vis.selectedComplaintTypes = Array.from(
        $('#incident-type-select :selected').map((d,i) => $(i).val())
    );

    vis.selectedComplaintTypes.forEach(function(d) {
        var numInstances = vis.chartData.filter(function(x) {return x.general_cap_classification == d}).length;
        $(("#incident-type-select option#" + formatSpacedStrings(d))).text((d + ' (' + numInstances + ')'));
    })
    $("#incident-type-select").trigger("chosen:updated");

}


FlowChart.prototype.setToolTips = function() {
    var vis = this;

    vis.tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function(d) {

            var tipText = "<div class='tip-text'>";
            tipText += "<strong>Complaint Date: </strong><span class='details'>" + d3.timeFormat("%-m/%d/%y")(d.date_received) + "<br></span>"
            if(d.incident_time) {
                tipText += "<strong>Incident Date: </strong><span class='details'>" + d.incident_time + "<br></span>"
            }
            tipText += "<strong>District: </strong><span class='details'>" + d.district_occurrence + "<br><br></span>";

            if (d.officer_id) {
                tipText += "<strong>Officer ID: </strong><span class='details'>" + d.officer_id + "<br></span>";
            }
            if (d.officer_initials) {
                tipText += "<strong>Officer Initials: </strong><span class='details'>" + d.officer_initials + "<br></span>";
            }
            tipText += "<strong>Officer Demographics: </strong><span class='details'>" + d.po_race + ', ' + d.po_sex + "<br><br></span>";

            tipText += "<strong>Complaint ID: </strong><span class='details'>" + d.complaint_id + "<br></span>";
            tipText += "<strong>Complainant Demographics: </strong><span class='details'>";

            tipText += [d.complainant_race, d.complainant_sex, d.complainant_age].filter(function(attr) {
                return attr;
            }).join(', ');


            tipText += "<br><br></span>";

            tipText += "<strong>Complaint Type: </strong><span class='details'>" + d.general_cap_classification + "<br></span>";

            if (d.summary) {
                tipText += "<strong>Complaint Summary: </strong><span class='details'>" + d.summary + "<br></span>";
            }
            else if (d.shortened_summary) {
                tipText += "<strong>Complaint Summary: </strong><span class='details'>" + d.shortened_summary + "<br></span>";
            }

            tipText += "</div>";

            return tipText;
        })
    vis.svg.call(vis.tip);

}

