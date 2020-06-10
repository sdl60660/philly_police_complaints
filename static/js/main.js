
// Initialize global variables
var officerDisciplineResults;
var phoneBrowsing = false;

var startDate = new Date("04/01/2015");
var currentDate = addDays(startDate, 0);

var flowChart;
var interval;

// Determine if the user is browsing on mobile and adjust worldMapWidth if they are
if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
    phoneBrowsing = true;
}

// Initialize timeline slider
function initSlider(maxDate) {
    $("#slider-div").slider({
        max: maxDate,
        min: 0,
        step: 7,
        range: false,
        value: 0,
        slide: function(event, ui) {
            currentDate = addDays(startDate, ui.value);
            updateCharts();
            // $("#yearLabel").text((ui.value - 1) + '-' + (ui.value));

            // displayYear = ui.value;
            // updateCharts();
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
            button.text("❙ ❙");
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
        // timeline.updateDimensions();
    })


function step() {
    // console.log(displayYear);
    // displayYear = displayYear == 2020 ? startYear : displayYear + 1;
    // $("#yearLabel").text((displayYear - 1) + '-' + (displayYear));
    // $("#slider-div").slider("value", displayYear);
    currentDate = addDays(currentDate, 7);
    var sliderValue = (currentDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)
    $("#slider-div").slider("value", sliderValue);
    updateCharts();
}


function updateCharts() {
    flowChart.wrangleData();
}


var promises = [
    d3.json("static/data/complaint_discipline_viz_data.json")
];

Promise.all(promises).then(function(allData) {

    // $('.loading-spinner')
    //     .remove();

    // Initialize D3 elements (timeline, maps, bar chart)
    // timeline = new Timeline("#slider-div");

    officerDisciplineResults = allData[0];

    var datasetDateRange = d3.extent(officerDisciplineResults, function(d) {
        return new Date(d.date_received);
    });

    var maxDateOffset = (datasetDateRange[1].getTime() - datasetDateRange[0].getTime()) / (1000 * 3600 * 24);
    initSlider(maxDateOffset);

    officerDisciplineResults.forEach(function(d) {
        d.date_received = new Date(d.date_received);
        if(d.disciplinary_findings == "Not Applicable") {
            d.end_state = d.investigative_findings;
        }
        else {
            d.end_state = d.disciplinary_findings;
        }
    })

    console.log(officerDisciplineResults);

    flowChart = new FlowChart("#chart-area")

    // interval = setInterval(step, 1300);
    // for (i=0; i < 100; i++) {
    //     currentDate = addDays(currentDate, 1);
    //     updateCharts();
    // }


});


