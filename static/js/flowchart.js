
FlowChart = function(_parentElement) {
    this.parentElement = _parentElement;

    this.initVis();
}


FlowChart.prototype.initVis = function() {
    var vis = this;

    vis.margin = {top: 85, right: 15, bottom: 45, left: 40};
    vis.width = 1000 - vis.margin.left - vis.margin.right;
    vis.height = 1100 - vis.margin.top - vis.margin.bottom;

    vis.svg = d3.select(vis.parentElement)
        .append("svg");
        // .attr("width", 1000)
        // .attr("height", 1500)

    vis.svg
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 1050 1100")


    vis.g = vis.svg.append("g")
        .attr("class", vis.parentGroupClass)
        .attr("id", "chart-data")
        .attr("transform",
              "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    vis.blockSize = 5;
    vis.blockSpacing = 1;
    vis.trueBlockWidth = (vis.blockSize + vis.blockSpacing);
    vis.transitionDelay = 20;
    vis.blockGroupWidth = 41;
    vis.fullBlockWidth = vis.blockGroupWidth*vis.trueBlockWidth;

    vis.highlightRectScalar = 10;

    vis.lastTooltipOffset;
    // vis.lastTooltipPos;

    vis.representedAttribute = 'no_group';

    vis.representedVals = {
        'no_group': ["default"],
        'complainant_race': ["black", "white", "latino"],
        'po_race': ["black", "white", "latino"],
        'district_income_group': ['higher', 'middle', 'lower'],
        'po_sex': ['male', 'female'],
        'complainant_sex': ['male', 'female'],
        'prior_complaints_group': ['none', 'one', 'multiple']
    };

    vis.color = d3.scaleOrdinal()
        .range(["#3232FF", "#FF1919", "#FFAC14"])
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
    vis.col2x = 169;
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

        "Sustained Finding": Math.round(vis.blockGroupWidth),
        "Guilty Finding": Math.round(vis.blockGroupWidth),
        "Training/Counseling": Math.round(vis.blockGroupWidth),
        "No Guilty Findings": Math.round(vis.blockGroupWidth),
        "Discipline Pending": Math.round(vis.blockGroupWidth)
    }

    vis.outcomeLabels = {}
    vis.outcomeCounts = {}

    // var outcomeLabels = vis.g.append("text")
    //     .data(Object.keys(vis.outcomeCoordinates))
    //     .enter()
    //     .attr("class", function(d) {
    //         return "group-label " + formatSpacedStrings(d);
    //     })
    //     .attr("x", function(d) {
    //         return vis.outcomeCoordinates[d][0] + (vis.trueBlockWidth * vis.colWidths[d] / 2);
    //     })
    //     .attr("y", function(d) {
    //         return vis.outcomeCoordinates[d][1] - 30;
    //     })
    //     .attr("text-anchor", "middle")
    //     .style("font-size", function(d) {
    //         if (['Investigation Pending', 'No Sustained Findings', 'Sustained Finding'].includes(d)) {
    //             return "12pt";
    //         }
    //         else {
    //             return "9pt";
    //         }
    //     })
    //     .on("mouseenter", function(d) {
    //         console.log(d);
    //     })
    //     .on("mouseout", function() {
    //         console.log("out");
    //     })
    //     .text(function(d) {
    //         return d;
    //     });

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
            .on("mouseenter", function() {
                console.log($(this).text());
            })
            .on("mouseout", function() {
                console.log("out");
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
        .lower();

    vis.legendSVG = d3.select("#flowchart-legend-area").append("svg");

    vis.setComplaintTypes();
    vis.wrangleData();
}



FlowChart.prototype.wrangleData = function() {
    var vis = this;

    vis.representedAttribute = $("#sort-feature-select").val();

    if (initFlowChart === true) {
        initFlowChart = false;

        endRange = addMonths(startRange, maxDateOffset);
        $("#end-date-display")
            .text(d3.timeFormat("%B %Y")(endRange));

        var sliderValue = monthDiff(startDate, endRange);
        $("#slider-div")
            .slider("values", 1, sliderValue);
    }

    vis.chartData = officerDisciplineResults
        .filter(function (d) {
            return d.date_received >= startRange && d.date_received <= endRange;
        })
        .filter(function(d) {
            // Revisit this later
            return vis.selectedComplaintTypes.includes(d.general_cap_classification);
        })
        .sort((a, b) => a.date_received - b.date_received)

    vis.updateComplaintTypes();

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
    vis.updateLegend();
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
                .attr("y", -100)
                .attr("x", vis.col2x + vis.trueBlockWidth * vis.colWidths["No Sustained Findings"]/2)
                .attr("height", vis.blockSize)
                .attr("width", vis.blockSize)
                // .style("border", "1px solid #f9f9f9")
                .attr("fill", function(d) {
                    if (vis.representedAttribute === 'no_group') {
                        return outcomeColors(d.end_state);
                    }
                    else {
                        return vis.color(d[vis.representedAttribute]);
                    }
                })
                .on("mouseenter", function(d) {
                    vis.tip.hide();

                    vis.tip.show(d);
                })
                .on("mouseout", function(d) {
                    $(".d3-tip").css('opacity', 0).css('pointer-events', 'none');
                })
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

                if (d.investigative_findings === "Sustained Finding") {
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
                    if (vis.representedAttribute === 'no_group') {
                        return outcomeColors(d.end_state);
                    }
                    else {
                        return vis.color(d[vis.representedAttribute]);
                    }
                })
                .attr("height", vis.blockSize)
                .attr("width", vis.blockSize)
                .attr("stroke-width", 0)
                .attr("stroke", "none")
                .style("opacity", 0.8);

}


FlowChart.prototype.highlightTile = function(index) {
    const vis = this;

    const transitionDuration = 800;
    const numRects = vis.g.selectAll("rect.complaint-box")._groups[0].length;

    var tileIndex = index;
    if (numRects-1 < index) {
        tileIndex = Math.round(getRandomArbitrary(0, numRects-1));
    }

    vis.featuredTile = vis.g.selectAll("rect.complaint-box").filter(function(d,i) { return i === tileIndex});

    vis.highlightTileX = vis.featuredTile.attr("x");
    vis.highlightTileY = vis.featuredTile.attr("y");

    vis.featuredTile
        .raise()
        .transition()
        .duration(transitionDuration)
            .attr("width", vis.trueBlockWidth*vis.highlightRectScalar - vis.blockSpacing)
            .attr("height", vis.trueBlockWidth*vis.highlightRectScalar  - vis.blockSpacing)
            .attr("x", vis.highlightTileX - (vis.trueBlockWidth*vis.highlightRectScalar - vis.blockSpacing) / 2)
            .attr("y", vis.highlightTileY - (vis.trueBlockWidth*vis.highlightRectScalar - vis.blockSpacing) / 2)
            .attr("stroke-width", 2)
            .attr("stroke", "white")
            .style("opacity", 0.9)
            .attr("box-shadow", "10px 10px");

    sleep(transitionDuration).then(() => {
        vis.tip.show(vis.featuredTile._groups[0][0].__data__, vis.featuredTile.node());
    })

}


FlowChart.prototype.returnTile = function() {
    const vis = this;

    d3.selectAll(".d3-tip")._groups[0].forEach(function(d) {
        d.remove();
    });

    vis.featuredTile
        .transition("return-tile-size")
        .duration(600)
            .attr("width", vis.blockSize)
            .attr("height", vis.blockSize)
            .attr("x", vis.highlightTileX)
            .attr("y", vis.highlightTileY)
            .attr("stroke-width", 0)
            .attr("stroke", "none")
            .style("opacity", 0.8)
            .attr("box-shadow", "none");
}


FlowChart.prototype.repositionTooltip = function() {
    const vis = this;

    const d3Tip = $(".d3-tip");

    const currentY = parseInt(d3Tip.css("top"));
    const newOffset = $("#flowchart-wrapper")[0].getBoundingClientRect().y;

    const newY = currentY + (vis.lastTooltipOffset - newOffset);
    vis.lastTooltipOffset = newOffset;

    d3Tip.css("top", newY);
}


FlowChart.prototype.setToolTips = function() {
    var vis = this;

    vis.tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset(function(d) {
            const tileOffset = $("#flowchart-wrapper")[0].getBoundingClientRect().y;
            vis.lastTooltipOffset = tileOffset;

            const trueMarginSize = $("#flowchart-tile")[0].getBoundingClientRect().y;

            if (d.investigative_findings === 'Sustained Finding') {
                var xOffset = -4;
            }
            else {
                var xOffset = vis.blockSize + 4;
            }

            return [trueMarginSize - Math.min(trueMarginSize, tileOffset), xOffset];
        })
        .direction(function(d) {
            if (d.investigative_findings === 'Sustained Finding') {
                return "w";
            }
            else {
                return "e";
            }
        })
        .html(function(d) {

            var tipText = "<div class='tip-text'>";

            tipText += "<span class='detail-title'>Complaint Date</span>: <span class='details'>" + d3.timeFormat("%-m/%d/%y")(d.date_received) + "<br></span>"
            if(d.incident_time) {
                tipText += "<span class='detail-title'>Incident Date</span>: <span class='details'>" + d3.timeFormat("%-m/%d/%y")(d.incident_time) + "<br></span>"
            }
            tipText += "<span class='detail-title'>District</span>: <span class='details'>" + d.district_occurrence + "<br></span>";
            tipText += "<span class='detail-title'>District Median Income</span>: <span class='details'>" + d3.format("$,.0f")(d.district_income) + "<br><br></span>";

            if (d.officer_id) {
                tipText += "<span class='detail-title'>Officer ID</span>: <span class='details'>" + d.officer_id + "<br></span>";
            }
            if (d.officer_initials) {
                tipText += "<span class='detail-title'>Officer Initials</span>: <span class='details'>" + d.officer_initials + "<br></span>";
            }
            tipText += "<span class='detail-title'>Officer Demographics</span>: <span class='details'>" + d.po_race + ', ' + d.po_sex + "<br></span>";

            if (d.officer_prior_complaints) {
                tipText += "<span class='detail-title'>Officer Prior Known Complaints</span>: <span class='details'>" + d.officer_prior_complaints + "<br><br></span>";
            }
            else {
                tipText += '<br>';
            }


            tipText += "<span class='detail-title'>Complaint ID</span>: <span class='details'>" + d.complaint_id + "<br></span>";
            tipText += "<span class='detail-title'>Complainant Demographics</span>: <span class='details'>";


            tipText += [d.complainant_race, d.complainant_sex, d.complainant_age].filter(function(attr) {
                return attr;
            }).join(', ');


            tipText += "<br><br></span>";

            tipText += "<span class='detail-title'>Complaint Type</span>: <span class='details'>" + d.general_cap_classification + "<br></span>";

            if (d.summary) {
                var summaryText = d.summary;
            }
            else if (d.shortened_summary) {
                var summaryText = d.shortened_summary;
            }

            // if (summaryText.length > 500 && phoneBrowsing === false) {
            //     summaryText = summaryText.slice(0, summaryText.slice(0, 500).lastIndexOf(" ")) + "... (click for more)";
            // }

            tipText += "<span class='detail-title'>Complaint Summary</span>: <span class='details' id='complaint-summary'>" + summaryText + "<br></span>";



            tipText += "</div>";

            return tipText;
        })
    vis.svg.call(vis.tip);

}



FlowChart.prototype.setComplaintTypes = function() {
    var vis = this;

    vis.incidentTypes.forEach(function(complaintName) {
        $("select#incident-type-select")
            .append('<option selected id="' + formatSpacedStrings(complaintName) + '" name="' + complaintName + '" value="' + complaintName + '">' + complaintName + '</option><br>');
    })

    $(".chosen-select")
        .chosen()

    vis.selectedComplaintTypes = Array.from(
        $('#incident-type-select :selected').map((d,i) => $(i).val())
    );

};


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

};


FlowChart.prototype.updateLegend = function() {
    const vis = this;

    let keys = vis.representedVals[vis.representedAttribute].slice();
    keys.push('other/unknown')

    if (vis.representedAttribute === 'no_group') {
        keys = [];
    }

    // Add one dot in the legend for each name.
    const size = 8;
    const topMargin = 10;
    const leftMargin = 5;
    const verticalSpacing = 9;
    const rects = vis.legendSVG.selectAll(".legend-rect")
      .data(keys, function(d) {
          return d;
      });

    rects.exit().remove();

    rects
      .enter()
      .append("rect")
        .attr("x", leftMargin)
        .attr("y", function (d,i) { return topMargin + i*(size+verticalSpacing); } )
        .attr("width", size)
        .attr("height", size)
        .attr("class", "legend-rect")
        .attr("fill-opacity", 0.8)
        .style("fill", function(d) { return vis.color(d); });

    const labels = vis.legendSVG.selectAll(".legend-label")
      .data(keys, function(d) {
          return d;
      });

    labels.exit().remove();

    labels
      .enter()
      .append("text")
        .attr("x", leftMargin + size*1.2 + 3)
        .attr("y", function(d,i) { return  topMargin + i*(size+verticalSpacing) + (size/2)}) // 100 is where the first dot appears. 25 is the distance between dots
        .style("fill", function(d) { return vis.color(d); })
        .text(function(d){ return d})
        .attr("text-anchor", "left")
        .attr("class", "legend-label")
        .style("alignment-baseline", "middle");

};

FlowChart.prototype.setSummaryTooltips = function() {
    var vis = this;

    vis.summaryTip = d3.tip
        .attr("class", "section-summary-tip")
        .offset()
        .html( function(d) {

            }
        );


    vis.svg.call(vis.summaryTip);

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



FlowChart.prototype.visEntrance = function() {
    var vis = this;

    endRange = addMonths(startRange, maxDateOffset);
    $("#end-date-display")
        .text( d3.timeFormat("%B %Y")(endRange));

    var sliderValue = monthDiff(startDate, endRange);
    $("#slider-div")
        .slider("values", 1, sliderValue);

    d3.selectAll("complaint-box")
        .remove()

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
                    if (d.investigative_findings == 'Sustained Finding') {
                        return outcomeColors(d.disciplinary_findings);
                    }
                    else {
                        return outcomeColors(d.investigative_findings);
                    }
                })
                // .on("click", function(d) {
                //     if (d.summary) {
                //         $(".details#complaint-summary").text(d.summary);
                //     }
                //     else if (d.shortened_summary) {
                //         $(".details#complaint-summary").text(d.shortened_summary);
                //     }
                // })
                .on("mouseenter", vis.tip.show)
                .on("mouseleave", function() {
                    vis.tip.hide();
                })
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
