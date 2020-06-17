
// Initialize global variables
var officerDisciplineResults;
var phoneBrowsing = false;

var startDate = new Date("01/01/2013");
var startRange = addMonths(startDate, 0);
var endRange = addMonths(startDate, 1);

var flowChart;
var timeline;
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
        range: true,
        values: [0, 1],
        slide: function(event, ui) {
            if ( ( ui.values[0] + 1 ) >= ui.values[1] ) {
                return false;
            }

            startRange = addMonths(startDate, ui.values[0]);
            endRange = addMonths(startDate, ui.values[1]);

            updateCharts();
            // $("#yearLabel").text((ui.value - 1) + '-' + (ui.value));

        }
        // slide: function(event, ui) {
        //     currentDate = addMonths(startDate, ui.value);

        //     // update date label
        //     $(".date-text")
        //         .text(d3.timeFormat("%B %Y")(currentDate));
        // }
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

    flowChart.wrangleData();
}


var promises = [
    d3.json("static/data/complaint_discipline_viz_data.json")
];

Promise.all(promises).then(function(allData) {

    officerDisciplineResults = allData[0];

    var datasetDateRange = d3.extent(officerDisciplineResults, function(d) {
        return new Date(d.date_received);
    });

    console.log(datasetDateRange)

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
    })

    officerDisciplineResults =officerDisciplineResults.filter(function(d) {
         return d.investigative_findings != "Not Applicable" && !(d.investigative_findings == "Sustained Finding" && d.disciplinary_findings == "Not Applicable");
    })

    flowChart = new FlowChart("#chart-area");

    $('.chosen-select').on('change', function(event){
        flowChart.wrangleData();
    });

    timeline = new Timeline("#slider-div");


});


