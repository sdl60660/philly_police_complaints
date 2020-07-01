
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
var hiddenOpacity = 0.2;

var maxDateOffset;

var initFlowChart = true;
// var flowChartEntered = false;
var sunburstEntered = false;

var scrollDirection = 'down';

const outcomeColors = d3.scaleOrdinal()
    .domain(["Sustained Finding", "No Sustained Findings", "Investigation Pending", "Guilty Finding", "Training/Counseling", "No Guilty Findings", "Discipline Pending"])
    .range(['#658dc6', '#f28e2c', '#8dc665', "#7498cb", "#93afd7", "#b2c6e2", "#a2a2a2"])

// Determine if the user is browsing on mobile
if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)  || window.innerWidth < 1200) {
    phoneBrowsing = true;

    $(".step")
        .css("font-size", "18pt");

    $(".step .body")
        .css("font-size", "18pt");
}


// Highlighted annotation text

const textAnnotations = {
    'highlighted term': 'Even this one!',

    'sustained finding': "PPD's Internal Affairs investigation determined that one or more of the allegations filed in the complaint were " +
    "supported (or other violations were discovered during the course of the investigation). These are then sent to the " +
    "Police Board of Inquiry for a hearing and possible discipline.",
    'investigation pending': "This indicates a PPD Interval Affairs investigation that is still in progress. " +
    "Sometimes investigations stay here for much longer than the mandated completion time of 75 days.",
    'no sustained findings': "PPD's Internal Affairs investigation determined that 'allegations could not be proven, allegations that did not occur" +
    " or that actions that occurred, but were correct, lawful and complied with departmental policies'.",

    'guilty finding': "On recommendation from the Police Board of Inquiry hearing, the Police Commissioner (or a delegate)" +
    " deems an officer's action worthy of discipline. Investigations classified in PPD's published data with a " +
    "'Guilty Finding' include suspensions, terminations, criminal prosecutions, and reprimands. The data provided by the " +
    "department makes no distinction.",
    'no guilty findings': "An investigation is referred from Internal Affairs after allegations are determined to be " +
    "supported by evidence. However, the Police Commissioner (or a delegate) determines that the officer is Not Guilty " +
    "after a Police Board of Inquiry hearing and recommendation.",
    'discipline pending': "An investigation from Internal Affairs has determined that one or more allegations are sustained, " +
    "but a disciplinary decision has not been made yet.",
    'training/counseling': "On recommendation from the Police Board of Inquiry hearing, the Police Commissioner (or a delegate)" +
    " deems an officer's action worthy of discipline, but opts for unspecified 'training/counseling' in lieu of suspension," +
    " termination, or criminal prosectution.",

    'white': "Classified by PPD as 'white'",
    'black': "Classified by PPD as 'black'",
    'latinx': "Classified by PPD as 'latino'",
    'other': "Includes less frequent race/ethnicity classification by PPD, as well as cases with multiple complainants" +
    " of different races/ethnicities",

    'last public update': "The city only publishes data for complaints filed within the past five years. For cases more than " +
    "five years old, no further updates are publicly available through the data portal. This means that technically, in 2020, " +
    "we don't necessarily know the latest details of a pending investigation from 2014, but we do know that it remained pending " +
    "for at least five years."
};

 // jQuery to move div and create pop-up tooltip with annotation

$('.annotated-text')
    // .on("mouseover", function() {
    .on("mousemove", function() {
        const tooltipSelect = $("#annotation-tooltip");

        tooltipSelect
            .text(textAnnotations[$(this).text().toLowerCase()]);

        let xOffset = event.pageX - tooltipSelect.width()/2;
        if (xOffset < 0) {
            xOffset += -1 * xOffset;
        }

        tooltipSelect
            .css({top: event.pageY - tooltipSelect.height() - 40, left: xOffset})
            .css("opacity", 1.0)
            .css("z-index", 100);
    })
    .on("mouseout", function() {
        $("#annotation-tooltip")
            .css("opacity", 0.0)
            .css("z-index", -1);
    });


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

        if (d.officer_prior_complaints > 1) {
            d.prior_complaints_group = 'multiple';
        }
        else if (d.officer_prior_complaints === 1) {
            d.prior_complaints_group = 'one';
        }
        else {
            d.prior_complaints_group = 'none';
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

            updateFlowchartDates();
        }
    })

}

// Initialize timeline play button
$("#play-button")
    .on("tap click", function() {
        var button = $(this);

        if (button.text() == "▶") {
            button.text("❙❙");
            interval = setInterval(step, 1300);
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
    
    updateFlowchartDates();

    if (monthDiff(startDate, endRange) === maxDateOffset) {
        $("#play-button")
            .text("▶");
        clearInterval(interval);
    };

}


function updateFlowchartDates() {
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
        .css("opacity", 1.0);

    $("#flowchart-tile")
        .css("opacity", 0.2);

    if (scrollDirection === 'up') {
        d3.selectAll(".d3-tip")._groups[0].forEach(function (d) {
            d.remove();
        });
    }

    sunburst.removeOutlineSections();

    if (scrollDirection === 'down') {
        sunburst.createOutlineSections(['Guilty Finding', 'Sustained Finding']);
    }
    setSelectOptions([["sunburst-complainant-race", "white"], ["sunburst-po-race", "black"]]);
    artificialHover("Guilty Finding");
}


function flowchartEntrance() {

    $("#sunburst-tile")
        .css("opacity", hiddenOpacity);

    $("#flowchart-tile")
        .css("opacity", 1.0);

    if (scrollDirection === 'up') {
        d3.selectAll(".d3-tip")._groups[0].forEach(function (d) {
            $(d).css("opacity", 0.0);
        });
        flowChart.svg.call(flowChart.tip);
    }

}

function highlightTile() {

    if (scrollDirection === 'down') {
        d3.selectAll(".d3-tip")._groups[0].forEach(function (d) {
            d.remove();
        });
        flowChart.svg.call(flowChart.tip);

        flowChart.highlightTile(1212);
    }

    else if (scrollDirection === 'up') {
        $("#sort-feature-select").val("no_group").trigger("chosen:updated");
        // flowChart.representedAttribute = 'no_group';
        flowChart.wrangleData();
    }

}


function showFlowchartByRace() {

    // $(".d3.tip").css("top", "");
    if (scrollDirection === 'down') {
        flowChart.returnTile();

        sleep(600).then(() => {
            $("#sort-feature-select").val("complainant_race").trigger("chosen:updated");
            // flowChart.representedAttribute = 'complainant_race';
            flowChart.wrangleData()
        })
    }
    else if (scrollDirection === 'up') {
        flowChart.returnTileSections();
    }

}

function highlightOverduePending() {
    startRange = startDate;
    endRange = new Date("Jan 01 2018");

    var sliderEndValue = monthDiff(startDate, endRange);
    $("#slider-div")
        .slider("values", 0, 0)
        .slider("values", 1, sliderEndValue);

    $("#start-date-display")
        .text(d3.timeFormat("%B %Y")(startRange));

    $("#end-date-display")
        .text( d3.timeFormat("%B %Y")(endRange));

    flowChart.wrangleData();
    flowChart.highlightTileSection("Investigation Pending");

}


var activeIndex;
var lastIndex;
function activate(index) {

    $("section.step")
        .css("opacity", hiddenOpacity);

    if (index-1 > 0) {
        $("section.step").eq(index - 1)
            .css("opacity", 1.0);
    }

    activeIndex = index;

    if (lastIndex > activeIndex) {
        scrollDirection = 'up'
    }
    else {
        scrollDirection = 'down';
    }
    console.log(scrollDirection);


    var sign = (activeIndex - lastIndex) < 0 ? -1 : 1;
    var scrolledSections = d3.range(lastIndex + sign, activeIndex + sign, sign);
    scrolledSections.forEach(function(i) {
        if (i-1 >= 0) {
            activateFunctions[i - 1]();
        }
    });

    lastIndex = activeIndex;
};


var scroll = scroller()
    .container(d3.select('body'));

var scrollerDiv;
if (phoneBrowsing === true) {
    scrollerDiv = '.mobile-spacer';
}
else {
    scrollerDiv = '.step';
}
scroll(d3.selectAll(scrollerDiv));

if (phoneBrowsing === true) {
    hiddenOpacity = 0.0;
}
else {
    hiddenOpacity = 0.2;
}


scroll.on('active', function(index){
    console.log(index);

    activate(index);
})

scroll.on('progress', function(index, progress) {
    const existingTipElement = $(".d3-tip");

    if (index >= 9 && lastIndex === index && existingTipElement.css("opacity") &&
        existingTipElement.css("opacity") !== "0") {
        flowChart.repositionTooltip();
        // endRange = addMonths(startDate, Math.round(Math.min(1, (progress / 33.8)) * maxDateOffset));
    }

    // console.log(index, progress);
})


// var activateFunctions = ['filler'];         // fix this later
var scrollerDivs = $(scrollerDiv);
var activateFunctions = [];
activateFunctions[0] = displayIntroText;

activateFunctions[1] = showSunburst;
activateFunctions[2] = showDisciplinaryGroups;
activateFunctions[3] = highlightGuilty;
activateFunctions[4] = guiltyWhiteComplainant;
activateFunctions[5] = guiltyBlackComplainant;
activateFunctions[6] = guiltyBlackComplainantWhiteOfficer;
activateFunctions[7] = guiltyWhiteComplainantBlackOfficer;
const sunburstWrapperHeight = scrollerDivs[8].getBoundingClientRect().bottom - scrollerDivs[1].getBoundingClientRect().top + 50 - 250;
$("#sunburst-wrapper")
    .css("height", sunburstWrapperHeight)


activateFunctions[8] = flowchartEntrance;
activateFunctions[9] = highlightTile;
activateFunctions[10] = showFlowchartByRace;
activateFunctions[11] = highlightOverduePending;

const flowChartWrapperHeight = scrollerDivs[scrollerDivs.length - 1].getBoundingClientRect().top - scrollerDivs[8].getBoundingClientRect().top + 500;
// console.log(flowChartWrapperHeight);
// contst flowChartWrapperHeight = 3000;
$("#flowchart-wrapper")
    .css("height", flowChartWrapperHeight)


// If mobile, and annotations are up top, adjust top-padding on viz-tiles to make room for fixed-position annotation
if (phoneBrowsing === true) {
    let maxAnnotationHeight = 150;
    $(".step").toArray().forEach(function (annotationBox) {
        const boxHeight = annotationBox.getBoundingClientRect().height;
        if (boxHeight > maxAnnotationHeight) {
            maxAnnotationHeight = boxHeight;
        }
    });
    $(".viz-tile:not(#intro-tile)")
        .css("padding-top", maxAnnotationHeight)
    // console.log(maxAnnotationHeight);
}


var promises = [
    d3.json("static/data/complaint_discipline_viz_data.json"),
    d3.json("static/data/district_demos.geojson")
];

Promise.all(promises).then(function(allData) {

    officerDisciplineResults = allData[0];
    districtGeoJSON = allData[1];

    // console.log(officerDisciplineResults);

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


    // if (phoneBrowsing === false) {
    $(".select")
        .chosen()
        .on('change', function (event) {
            flowChart.wrangleData();
        });

    // $('.chosen-select')
    //     .chosen()
    //     .on('change', function (event) {
    //     flowChart.wrangleData();
    // });
    // }

    // districtMap = new DistrictMap("#map-area");

});


