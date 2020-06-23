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

    vis.margin = {top: 95, right: 45, bottom: 45, left: 40};
    vis.width = 1100 - vis.margin.left - vis.margin.right;
    vis.height = 1100 - vis.margin.top - vis.margin.bottom;

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
        .attr("viewBox", "0 0 1000 1100")
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
    vis.blockGroupWidth = 40;
    vis.fullBlockWidth = vis.blockGroupWidth*vis.trueBlockWidth;

    vis.representedAttribute = 'no_group';

    vis.representedVals = {
        'no_group': ["default"],
        'complainant_race': ["black", "white", "latino"],
        'po_race': ["black", "white", "latino"],
        'district_income': ['high', 'middle', 'low']
    };
    vis.color = d3.scaleOrdinal()
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

    vis.col1x = 0;
    vis.col2x = 175;
    vis.col3x = 700;

    vis.row1y = -35;

    vis.outcomeCoordinates = {

        "Investigation Pending": [vis.col1x, vis.row1y],

        "No Sustained Findings": [vis.col2x, vis.row1y],

        "Sustained Finding": [vis.col3x, vis.row1y],
        "Guilty Finding": [vis.col3x, vis.row1y + 55],
        "Training/Counseling": [vis.col3x, vis.row1y + 175],
        "No Guilty Findings": [vis.col3x, vis.row1y + 395],
        "Discipline Pending": [vis.col3x, vis.row1y + 525]
    }

    vis.colWidths = {
        "Investigation Pending": Math.round(0.5*vis.blockGroupWidth),

        "No Sustained Findings": Math.round(2.0*vis.blockGroupWidth),

        "Sustained Finding": Math.round(1.0*vis.blockGroupWidth),
        "Guilty Finding": Math.round(1.0*vis.blockGroupWidth),
        "Training/Counseling": Math.round(1.0*vis.blockGroupWidth),
        "No Guilty Findings": Math.round(1.0*vis.blockGroupWidth),
        "Discipline Pending": Math.round(1.0*vis.blockGroupWidth)
    }

    vis.outcomeLabels = {}
    vis.outcomeCounts = {}

    for (let [key, value] of Object.entries(vis.outcomeCoordinates)) {
        var outcomeLabel = vis.g.append("text")
            .attr("class", "group-label " + formatSpacedStrings(key))
            .attr("x", value[0] + (vis.trueBlockWidth * vis.colWidths[key] / 2))
            .attr("y", value[1] - 30)
            .attr("text-anchor", "middle")
            .style("font-size", function() {
                if (['Investigation Pending', 'No Sustained Findings', 'Sustained Finding'].includes(key)) {
                    return "12pt";
                }
                else {
                    return "9pt";
                }
            })
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

    // Outline all Sustained Finding subgroups to make relationship more clear
    vis.svg.append("rect")
        .attr("x", vis.col3x + 25)
        .attr("y", vis.row1y + 80)
        .attr("width", vis.fullBlockWidth*1.1)
        .attr("height", 620)
        .attr("stroke-width", "1px")
        .attr("stroke", "black")
        .attr("fill", "rgba(255,255,255,0.5)")
        .attr("rx", 10)
        .attr("ry", 10)
        .lower()

    vis.wrangleData();
}



FlowChart.prototype.wrangleData = function() {
    var vis = this;

    if (initFlowChart === false) {
        vis.updateComplaintTypes();

        vis.chartData = officerDisciplineResults
            .filter(function (d) {
                return d.date_received >= startRange && d.date_received <= endRange;
            })
            .filter(function(d) {
                // Revisit this later
                return vis.selectedComplaintTypes.includes(d.general_cap_classification);
            })
            .sort((a, b) => a.date_received - b.date_received)
    }

    else {
        vis.chartData = officerDisciplineResults;
    }

    vis.reverseSortOrder = vis.representedVals[vis.representedAttribute].slice().reverse();

    if (vis.representedAttribute != 'no_group') {
        vis.chartData = vis.chartData
            .sort(function (a, b) {
                return vis.reverseSortOrder.indexOf(b[vis.representedAttribute]) - vis.reverseSortOrder.indexOf(a[vis.representedAttribute]);
            });
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
        d.final_state_index = vis.finalOutcomeIndices[d.end_state];
        vis.finalOutcomeIndices[d.end_state] += 1
    })


    vis.color
        .domain(vis.representedVals[vis.representedAttribute])

    vis.setToolTips();

    if (initFlowChart == true) {
        initFlowChart = false;

        vis.chartData.sort(function (a, b) { return 0.5 - Math.random() });
    }
    else {
        vis.updateVis();
    }
}


FlowChart.prototype.visEntrance = function() {
    var vis = this;

    endRange = addMonths(startRange, maxDateOffset);
    $("#end-date-display")
        .text( d3.timeFormat("%B %Y")(endRange));

    var sliderValue = monthDiff(startDate, endRange);
    $("#slider-div")
        .slider("values", 1, sliderValue);

    // JOIN data with any existing elements
    vis.flowchart = vis.g
        .selectAll("rect")
        .data(vis.chartData , function(d) {
            return d.discipline_id;
        })

    // ENTER new elements present in the data...
    vis.flowchart
        .enter()
            .append("rect")
                .attr("class", "complaint-box")
                .style("opacity", 0.0)
                .attr("y", -100)
                // .attr("x", vis.width/2)
                .attr("x",  function(d) {
                    return vis.outcomeCoordinates[d.end_state][0] + vis.trueBlockWidth * (d.final_state_index%vis.colWidths[d.end_state]);
                })
                .attr("height", vis.blockSize)
                .attr("width", vis.blockSize)
                .attr("fill", function(d) {
                    return vis.color(d[vis.representedAttribute]);
                })
                .on("mouseover", vis.tip.show)
                .on("mouseout", vis.tip.hide)
                .transition()
                    // .duration(200)
                    .delay(function(d,i) {
                        return i * 0.13;
                    })
                    .style("opacity", 0.8)
                    .attr("y", function(d,i) {
                        return vis.outcomeCoordinates[d.end_state][1] + vis.trueBlockWidth * ~~(d.final_state_index/vis.colWidths[d.end_state]);
                    })

    vis.setComplaintTypes();

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
                .attr("y", -100)
                .attr("x", vis.col2x + vis.trueBlockWidth * vis.colWidths["No Sustained Findings"]/2)
                .attr("height", vis.blockSize)
                .attr("width", vis.blockSize)
                .attr("fill", function(d) {
                    return vis.color(d[vis.representedAttribute]);
                })
                .on("mouseover", vis.tip.show)
                .on("mouseout", vis.tip.hide)
                    .transition()
                        .duration(400)
                        .delay(100)
                        .attr("x",  function(d,i) {
                            return vis.outcomeCoordinates[d.end_state][0] + vis.trueBlockWidth * (d.final_state_index%vis.colWidths[d.end_state]);
                        })
                        .attr("y", function(d,i) {
                            return vis.outcomeCoordinates[d.end_state][1] + vis.trueBlockWidth * ~~(d.final_state_index/vis.colWidths[d.end_state]);
                        })
                        // .style("opacity", 0.8)
                    
    vis.flowchart
        .transition()
            .duration(400)
            .delay(function(d) {

                if (d.investigative_findings == "Sustained Finding") {
                    return 100;
                }
                else {
                    return 100;
                }
            })
                .attr("x",  function(d,i) {
                    return vis.outcomeCoordinates[d.end_state][0] + vis.trueBlockWidth * (d.final_state_index%(vis.colWidths[d.end_state]));
                })
                .attr("y", function(d,i) {
                    return vis.outcomeCoordinates[d.end_state][1] + vis.trueBlockWidth * Math.floor(1.0*(d.final_state_index)/vis.colWidths[d.end_state]);
                })
                .attr("fill", function(d) {
                    return vis.color(d[vis.representedAttribute]);
                })
                .style("opacity", 0.8)

    // sleep(1100).then(() => {
    //     vis.updateCounts();
    //     // vis.setPathArrows();
    // })


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
                return d[stateVar] == outcome && d[vis.representedAttribute] == group;
            }).length
            
            var groupTotal = vis.chartData.filter(function(d) {
                return d[vis.representedAttribute] == group;
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
        .offset([-vis.blockSize, 0])
        .html(function(d) {

            var tipText = "<div class='tip-text'>";
            tipText += "<span class='detail-title'>Complaint Date</span>: <span class='details'>" + d3.timeFormat("%-m/%d/%y")(d.date_received) + "<br></span>"
            if(d.incident_time) {
                tipText += "<span class='detail-title'>Incident Date</span>: <span class='details'>" + d3.timeFormat("%-m/%d/%y")(d.incident_time) + "<br></span>"
            }
            tipText += "<span class='detail-title'>District</span>: <span class='details'>" + d.district_occurrence + "<br><br></span>";

            if (d.officer_id) {
                tipText += "<span class='detail-title'>Officer ID</span>: <span class='details'>" + d.officer_id + "<br></span>";
            }
            if (d.officer_initials) {
                tipText += "<span class='detail-title'>Officer Initials</span>: <span class='details'>" + d.officer_initials + "<br></span>";
            }
            tipText += "<span class='detail-title'>Officer Demographics</span>: <span class='details'>" + d.po_race + ', ' + d.po_sex + "<br><br></span>";

            tipText += "<span class='detail-title'>Complaint ID</span>: <span class='details'>" + d.complaint_id + "<br></span>";
            tipText += "<span class='detail-title'>Complainant Demographics</span>: <span class='details'>";

            tipText += [d.complainant_race, d.complainant_sex, d.complainant_age].filter(function(attr) {
                return attr;
            }).join(', ');


            tipText += "<br><br></span>";

            tipText += "<span class='detail-title'>Complaint Type</span>: <span class='details'>" + d.general_cap_classification + "<br></span>";

            if (d.summary) {
                tipText += "<span class='detail-title'>Complaint Summary</span>: <span class='details'>" + d.summary + "<br></span>";
            }
            else if (d.shortened_summary) {
                tipText += "<span class='detail-title'>Complaint Summary</span>: <span class='details'>" + d.shortened_summary + "<br></span>";
            }

            tipText += "</div>";

            return tipText;
        })
    vis.svg.call(vis.tip);

}

