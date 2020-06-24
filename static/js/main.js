
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

const investigativeOutcomeColor = d3.scaleOrdinal()
        .domain(["Sustained Finding", "No Sustained Findings", "Investigation Pending"])
        .range(['#658DC6', '#f28e2c', '#b8e827'])

// Determine if the user is browsing on mobile
if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
    phoneBrowsing = true;
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

// $(".ui-slider-handle")
//     .hide();

// Initialize timeline play button
$("#play-button")
    .on("tap click", function() {
        var button = $(this);

        if (button.text() == "▶") {
            button.text("❙❙");
            interval = setInterval(step, 500);
        }
        else {
            button.text("▶");
            clearInterval(interval);
        }
        
    });



// Resize timeline on window size/jquery ui slider size change
$(window)
    .resize(function() {
        timeline.updateDimensions();
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

    $("#flowchart-tile")
        .hide()

    $("#intro-tile")
        .show()

    var format = d3.format(",.0f")

    d3.select("#total-complaints")
        .datum("5099")
        .transition()
        .delay(300)
        .duration(1500)
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
        .duration(1200)
        .textTween(function(d) {
            const i = d3.interpolate(0, d);
            return function(t) { return format(this._current = i(t)); };
        })
        .end();
}


function flowchartEntrance() {
    $("#intro-tile")
        .hide()

    $("#flowchart-tile")
        .show()

    flowChart.representedAttribute = 'no_group';

    // initFlowChart = true;
    flowChart.visEntrance();
    timeline = new Timeline("#slider-div");
}

function showFlowchartByRace() {
    flowChart.representedAttribute = 'complainant_race';
    flowChart.wrangleData();

    $("#flowchart-tile")
        .show()

    $("#sunburst-tile")
        .hide();
}


function showSunburst() {
    $("#flowchart-tile")
        .hide();

    $("#sunburst-tile")
        .show();
}


var activeIndex;
var lastIndex;
function activate(index) {
    activeIndex = index;
    var sign = (activeIndex - lastIndex) < 0 ? -1 : 1;
    var scrolledSections = d3.range(lastIndex + sign, activeIndex + sign, sign);
    scrolledSections.forEach(function(i) {
        console.log(activateFunctions[i])
        activateFunctions[i]();
    });
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
    if (index == 2) {
        // endRange = addMonths(startDate, Math.round(Math.min(1, (progress / 33.8)) * maxDateOffset));
        // updateCharts();
    }

    // console.log(index, progress);
})


var activateFunctions = ['filler'];         // fix this later
activateFunctions[1] = displayIntroText;
activateFunctions[2] = flowchartEntrance;
activateFunctions[3] = showFlowchartByRace;
activateFunctions[4] = showSunburst;

console.log(activateFunctions);


var promises = [
    d3.json("static/data/complaint_discipline_viz_data.json"),
    d3.json("static/data/district_demos.geojson")
    // d3.csv("static/data/test.csv")
];

Promise.all(promises).then(function(allData) {

    officerDisciplineResults = allData[0];
    districtGeoJSON = allData[1];


    var datasetDateRange = d3.extent(officerDisciplineResults, function(d) {
        return new Date(d.date_received);
    });

    // var maxDateOffset = (datasetDateRange[1].getTime() - datasetDateRange[0].getTime()) / (1000 * 3600 * 24);
    maxDateOffset = monthDiff(datasetDateRange[0], datasetDateRange[1]);

    initSlider(maxDateOffset);

    officerDisciplineResults.forEach(function(d) {
        d.date_received = new Date(d.date_received);

        if (!d.complainant_race) {
            d.complainant_race = 'unknown';
        }
        if (!d.complainant_sex) {
            d.complainant_sex = 'unknown';
        }

        if(d.investigative_findings == "Pending") {
            d.investigative_findings = "Investigation Pending";
        }

        if(d.disciplinary_findings == "Pending") {
            d.disciplinary_findings = "Discipline Pending";
        }

        if(d.disciplinary_findings == "Not Applicable" || d.investigative_findings == "Investigation Pending") {
            d.end_state = d.investigative_findings;
        }
        else {
            d.end_state = d.disciplinary_findings;
        }

        if(d.incident_time) {
            d.incident_time = d3.timeParse("%Y-%m-%d %H:%M:%S")(d.incident_time);
        }

        d.no_group = 'default';
    })

    officerDisciplineResults =officerDisciplineResults.filter(function(d) {
         return d.investigative_findings != "Not Applicable" && !(d.investigative_findings == "Sustained Finding" && d.disciplinary_findings == "Not Applicable");
    })

    flowChart = new FlowChart("#chart-area");

    $('.chosen-select').on('change', function(event){
        flowChart.wrangleData();
    });

    districtMap = new DistrictMap("#map-area");

    sunburst = new Sunburst("#sunburst-area");


});


