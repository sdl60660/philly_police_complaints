
// Initialize global variables
var officerDisciplineResults;
var phoneBrowsing = false;

var districtGeoJSON;
var sunburstTest;

var startDate = new Date("01/01/2013");
var startRange = addMonths(startDate, 0);
var endRange = addMonths(startDate, 1);

var flowChart;
var districtMap;
var sunburst;
var introText;
var timeline;
var interval;

var maxDateOffset;

var initFlowChart = true;
// var flowChartEntered = false;
var sunburstEntered = false;

var scrollDirection = 'down';

const outcomeColors = d3.scaleOrdinal()
    .domain(["Sustained Finding", "No Sustained Findings", "Investigation Pending", "Guilty Finding", "Training/Counseling", "No Guilty Findings", "Discipline Pending"])
    .range(['#658dc6', '#f28e2c', '#8dc665', "#7498cb", "#93afd7", "#b2c6e2", "#a2a2a2"])

// Determine if the user is browsing on mobile
if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
    phoneBrowsing = true;
}

function preprocessDataset(dataset) {
    dataset.forEach(function(d) {
        d.date_received = new Date(d.date_received);

        if (!d.complainant_race) {
            d.complainant_race = 'unknown';
        }
        if (!d.complainant_sex) {
            d.complainant_sex = 'unknown';
        }

        if (d.investigative_findings === "Pending") {
            d.investigative_findings = "Investigation Pending";
        }

        if (d.disciplinary_findings === "Pending") {
            d.disciplinary_findings = "Discipline Pending";
        }

        if (d.disciplinary_findings === "Not Applicable" || d.investigative_findings === "Investigation Pending") {
            d.end_state = d.investigative_findings;
        }
        else {
            d.end_state = d.disciplinary_findings;
        }

        if(d.incident_time) {
            d.incident_time = d3.timeParse("%Y-%m-%d %H:%M:%S")(d.incident_time);
        }

        if (d.district_income < 35000) {
            d.district_income_group = 'lower';
        }
        else if (d.district_income < 55000) {
            d.district_income_group = 'middle';
        }
        else if (d.district_income >= 55000) {
            d.district_income_group = 'higher';
        }
        else {
            d.district_income_group = null;
        }

        d.no_group = 'default';
    })

    return dataset;
}

// Initialize timeline slider
function initSlider(maxDate) {

    $("#slider-div").slider({
        max: maxDate,
        min: 0,
        step: 1,
        range: true,
        values: [0, 1],
        slide: function(event, ui) {
            if ( ( ui.values[0] + 1 ) >= ui.values[1] ) {
                return false;
            }

            startRange = addMonths(startDate, ui.values[0]);
            endRange = addMonths(startDate, ui.values[1]);

            updateCharts();
        }
    })

}

// Initialize timeline play button
$("#play-button")
    .on("tap click", function() {
        var button = $(this);

        if (button.text() == "▶") {
            button.text("❙❙");
            interval = setInterval(step, 700);
        }
        else {
            button.text("▶");
            clearInterval(interval);
        }
        
    });


// Resize timeline on window size/jquery ui slider size change
$(window)
    .resize(function() {
        if (timeline) {
            timeline.updateDimensions();
        }
    })


function step() {
    endRange = monthDiff(startDate, endRange) >= maxDateOffset ? addMonths(startRange, 1) : addMonths(endRange, 1);
    
    var sliderValue = monthDiff(startDate, endRange);
    $("#slider-div")
        .slider("values", 1, sliderValue);
    
    updateCharts();
}


function updateCharts() {
    $("#start-date-display")
        .text(d3.timeFormat("%B %Y")(startRange));

    $("#end-date-display")
        .text( d3.timeFormat("%B %Y")(endRange));

    var sliderValue = monthDiff(startDate, endRange);
    $("#slider-div")
        .slider("values", 1, sliderValue);

    flowChart.wrangleData();
}


function displayIntroText() {

    $("#intro-tile")
        .css("opacity", 1.0)

    $("#sunburst-tile")
        .css("opacity", 0.2);

    var format = d3.format(",.0f")

    d3.select("#total-complaints")
        .datum("5099")
        .transition()
        .delay(300)
        .duration(1200)
        .ease(d3.easeExpInOut)
        .textTween(function(d) {
            const i = d3.interpolate(0, d);
            return function(t) { return format(this._current = i(t)); };
        })
        .end();

    d3.select("#total-investigations")
        .datum("12930")
        .transition()
        .delay(400)
        .duration(1300)
        .textTween(function(d) {
            const i = d3.interpolate(0, d);
            return function(t) { return format(this._current = i(t)); };
        })
        .end();
}


function showSunburst() {
    $("#intro-tile")
        .css("opacity", 0.2)

    $("#sunburst-tile")
        .css("opacity", 1.0);

    if (sunburstEntered === false) {
        sunburst = new Sunburst("#sunburst-area");
        sunburstEntered = true;
    }

    $("#sunburst-area path.child")
        .css("fill-opacity", 0.3);

    $("#sunburst-area path.parent")
        .css("fill-opacity", 0.8);
}


function showDisciplinaryGroups() {
    // $("#sunburst-tile")
    //     .show();
    //
    // $("#flowchart-tile")
    //     .hide()
    setSelectOptions([["sunburst-complainant-race", "all"], ["sunburst-po-race", "all"]]);


    $("#sunburst-area path.child")
        .css("fill-opacity", 0.8);

    $("#sunburst-area path.parent")
        .css("fill-opacity", 0.3);

}


function artificialHover(outcomeName) {
    $("#sunburst-area path").removeAttr('style');

    const guiltyFindingElement = $(`path#${outcomeName.replace(" ", "-")}`)[0];
    const guiltyValue = guiltyFindingElement.getAttribute("value");
    sunburst.mouseover(guiltyValue, guiltyFindingElement);
}

function setSelectOptions(optionPairs) {
    optionPairs.forEach(function(pair) {
        var selectID = pair[0];
        var optionVal = pair[1];

        $(`select#${selectID}`)
            .val(optionVal)
            .attr("class", `sunburst-select ${$(`select#${selectID}`).val()}`);
    })

    sunburst.wrangleData();
}


function highlightGuilty() {
    setSelectOptions([["sunburst-complainant-race", "all"], ["sunburst-po-race", "all"]]);
    artificialHover("Guilty Finding");
}


function guiltyWhiteComplainant() {
    setSelectOptions([["sunburst-complainant-race", "white"], ["sunburst-po-race", "all"]]);
    artificialHover("Guilty Finding");
}


function guiltyBlackComplainant() {
    setSelectOptions([["sunburst-complainant-race", "black"], ["sunburst-po-race", "all"]]);
    artificialHover("Guilty Finding");
}

function guiltyBlackComplainantWhiteOfficer() {
    sunburst.removeOutlineSections();
    setSelectOptions([["sunburst-complainant-race", "black"], ["sunburst-po-race", "white"]]);
    artificialHover("Guilty Finding");
}


function guiltyWhiteComplainantBlackOfficer() {
    $("#sunburst-tile")
        .css("opacity", 1.0)

    $("#flowchart-tile")
        .css("opacity", 0.2)

    sunburst.removeOutlineSections();

    if (scrollDirection === 'down') {
        sunburst.createOutlineSections(['Guilty Finding', 'Sustained Finding']);
    }
    setSelectOptions([["sunburst-complainant-race", "white"], ["sunburst-po-race", "black"]]);
    artificialHover("Guilty Finding");
}


function flowchartEntrance() {

    $("#sunburst-tile")
        .css("opacity", 0.2);

    $("#flowchart-tile")
        .css("opacity", 1.0);

    if (scrollDirection === 'up') {
        d3.selectAll(".d3-tip")._groups[0].forEach(function(d) {
            d.remove();
        });

        flowChart.representedAttribute = 'no_group';
        flowChart.wrangleData();
    }

    // initFlowChart = true;
    // if (flowChartEntered === false) {
    //     flowChart.visEntrance();
    //     timeline = new Timeline("#slider-div");
    //     flowChartEntered = true;
    // }
    // else {
    //     flowChart.wrangleData();
    // }
}

function highlightTile() {

    if (scrollDirection === 'up') {
        d3.selectAll(".d3-tip")._groups[0].forEach(function(d) {
            d.remove();
        });
    }

    flowChart.highlightTile(1212);

}


function showFlowchartByRace() {

    flowChart.returnTile()

    sleep(600).then(() => {
        flowChart.representedAttribute = 'complainant_race';
        flowChart.wrangleData()
    })


    // flowChart.representedAttribute = 'complainant_race';
    // flowChart.wrangleData();

    // $("#flowchart-tile")
    //     .show()
}



var activeIndex;
var lastIndex;
function activate(index) {

    $("section.step")
        .css("opacity", 0.2);

    $("section.step").eq(index-1)
        .css("opacity", 1.0);

    activeIndex = index;
    var sign = (activeIndex - lastIndex) < 0 ? -1 : 1;
    var scrolledSections = d3.range(lastIndex + sign, activeIndex + sign, sign);
    scrolledSections.forEach(function(i) {
        if (i-1 >= 0) {
            activateFunctions[i - 1]();
        }
    });

    if (lastIndex < activeIndex) {
        scrollDirection = 'down'
    }
    else {
        scrollDirection = 'up';
    }
    console.log(scrollDirection);
    lastIndex = activeIndex;
};


var scroll = scroller()
    .container(d3.select('body'));

scroll(d3.selectAll('.step'));

scroll.on('active', function(index){
    console.log(index);

    activate(index);
})

scroll.on('progress', function(index, progress) {
    if (index === 10 && lastIndex == 10 && flowChart.featuredTile) {
        console.log('here');
        flowChart.repositionTooltip();
        // endRange = addMonths(startDate, Math.round(Math.min(1, (progress / 33.8)) * maxDateOffset));
        // updateCharts();
    }

    // console.log(index, progress);
})


// var activateFunctions = ['filler'];         // fix this later
var activateFunctions = [];
activateFunctions[0] = displayIntroText;

activateFunctions[1] = showSunburst;
activateFunctions[2] = showDisciplinaryGroups;
activateFunctions[3] = highlightGuilty;
activateFunctions[4] = guiltyWhiteComplainant;
activateFunctions[5] = guiltyBlackComplainant;
activateFunctions[6] = guiltyBlackComplainantWhiteOfficer;
activateFunctions[7] = guiltyWhiteComplainantBlackOfficer;
const sunburstWrapperHeight = $(".step")[8].getBoundingClientRect().bottom - $(".step")[1].getBoundingClientRect().top + 50 - 300;
$("#sunburst-wrapper")
    .css("height", sunburstWrapperHeight)


activateFunctions[8] = flowchartEntrance;
activateFunctions[9] = highlightTile;
activateFunctions[10] = showFlowchartByRace;
const flowChartWrapperHeight = $(".step")[11].getBoundingClientRect().top - $(".step")[8].getBoundingClientRect().top + 400;
// console.log(flowChartWrapperHeight);
// contst flowChartWrapperHeight = 3000;
$("#flowchart-wrapper")
    .css("height", flowChartWrapperHeight)



var promises = [
    d3.json("static/data/complaint_discipline_viz_data.json"),
    d3.json("static/data/district_demos.geojson")
];

Promise.all(promises).then(function(allData) {

    officerDisciplineResults = allData[0];
    districtGeoJSON = allData[1];

    $("#sunburst-tile")
        .css("opacity", 0.2);

    $("#flowchart-tile")
        .css("opacity", 0.2);

    var datasetDateRange = d3.extent(officerDisciplineResults, function(d) {
        return new Date(d.date_received);
    });

    // var maxDateOffset = (datasetDateRange[1].getTime() - datasetDateRange[0].getTime()) / (1000 * 3600 * 24);
    maxDateOffset = monthDiff(datasetDateRange[0], datasetDateRange[1]);

    initSlider(maxDateOffset);

    officerDisciplineResults = preprocessDataset(officerDisciplineResults);
    officerDisciplineResults =officerDisciplineResults.filter(function(d) {
         return d.investigative_findings !== "Not Applicable" && !(d.investigative_findings === "Sustained Finding" && d.disciplinary_findings === "Not Applicable");
    })

    flowChart = new FlowChart("#chart-area");
    timeline = new Timeline("#slider-div");

    $('.chosen-select').on('change', function(event){
        flowChart.wrangleData();
    });

    districtMap = new DistrictMap("#map-area");

});


