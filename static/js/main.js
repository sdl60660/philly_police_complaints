
// Initialize global variables
var officerDisciplineResults;
var phoneBrowsing = false;

var startDate = new Date("04/01/2015");
var currentDate = addMonths(startDate, 0);

var flowChart;
var interval;

var maxDateOffset;

// Determine if the user is browsing on mobile and adjust worldMapWidth if they are
if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
    phoneBrowsing = true;
}

// Initialize timeline slider
function initSlider(maxDate) {

    $("#slider-div").slider({
        max: maxDate,
        min: 0,
        step: 1,
        range: false,
        value: 0,
        change: function(event, ui) {
            currentDate = addMonths(startDate, ui.value);

            updateCharts();
            // $("#yearLabel").text((ui.value - 1) + '-' + (ui.value));

        },
        slide: function(event, ui) {
            currentDate = addMonths(startDate, ui.value);

            // update date label
            $(".date-text")
                .text(d3.timeFormat("%B %Y")(currentDate));
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
    // var sliderValue = (currentDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)

    currentDate = monthDiff(startDate, currentDate) >= maxDateOffset ? startDate : addMonths(currentDate, 1);
    
    var sliderValue = monthDiff(startDate, currentDate);
    $("#slider-div")
        .slider("value", sliderValue);
    
    updateCharts();
}


function updateCharts() {
    $(".date-text")
        .text(d3.timeFormat("%B %Y")(currentDate));

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

    // var maxDateOffset = (datasetDateRange[1].getTime() - datasetDateRange[0].getTime()) / (1000 * 3600 * 24);
    maxDateOffset = monthDiff(datasetDateRange[0], datasetDateRange[1]);
    console.log(maxDateOffset);

    initSlider(maxDateOffset);

    officerDisciplineResults.forEach(function(d) {
        d.date_received = new Date(d.date_received);

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
    })

    officerDisciplineResults = officerDisciplineResults.filter(function(d) {
         return d.investigative_findings != "Not Applicable";
    })

    // console.log(officerDisciplineResults);

    flowChart = new FlowChart("#chart-area")

    // interval = setInterval(step, 1300);
    // for (i=0; i < 100; i++) {
    //     currentDate = addDays(currentDate, 1);
    //     updateCharts();
    // }


});


