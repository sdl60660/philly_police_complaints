


Sunburst = function(_parentElement) {
    this.parentElement = _parentElement;

    this.initVis();
}

Sunburst.prototype.initVis = function() {
    var vis = this;

    // Dimensions of sunburst.
    vis.width = 750;
    vis.height = 600;
    vis.radius = Math.min(vis.width, vis.height) / 2;

    // Breadcrumb dimensions: width, height, spacing, width of tip/tail.
    vis.b = {
      w: 75, h: 30, s: 3, t: 10
    };

    // Mapping of step names to colors.
    vis.colors =
        d3.scaleOrdinal()
            .domain(["home", "product", "search", "account", "other", "end"])
            .range(["#5d85cf", "#7c6561", "#da7847", "#6fb971", "#9e70cf", "#bbbbbb"])

    // Total size of all segments; we set this later, after loading the data.
    vis.totalSize = 0;

    vis.svg = d3.select(vis.parentElement).append("svg:svg")
        .attr("width", vis.width)
        .attr("height", vis.height)
        .append("svg:g")
        .attr("id", "container")
        .attr("transform", "translate(" + vis.width / 2 + "," + vis.height / 2 + ")");


    vis.partition = (data) =>
        d3.partition().size([2 * Math.PI, vis.radius * vis.radius])(
            d3
                .hierarchy(data)
                .sum(d => d.value)
                .sort((a, b) => b.value - a.value)
          )

    vis.arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .padAngle(1 / vis.radius)
        .padRadius(vis.radius)
        .innerRadius(d => Math.sqrt(d.y0))
        .outerRadius(d => Math.sqrt(d.y1) - 1)

    vis.mousearc = d3
        .arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .innerRadius(d => Math.sqrt(d.y0))
        .outerRadius(vis.radius)


    vis.wrangleData();
}

Sunburst.prototype.wrangleData = function() {
    var vis = this;

    var json = buildHierarchy(sunburstTest);
    vis.createVisualization(json);
}

// Main function to draw and set up the visualization, once we have the data.
Sunburst.prototype.createVisualization = function(json) {
    var vis = this;

    // Basic setup of page elements.
    vis.initializeBreadcrumbTrail();

    // Bounding circle underneath the sunburst, to make it easier to detect
    // when the mouse leaves the parent g.
    vis.svg.append("svg:circle")
        .attr("r", vis.radius)
        .style("opacity", 0);

    // Turn the data into a d3 hierarchy and calculate the sums.
    var root = d3.hierarchy(json)
        .sum(function(d) { return d.size; })
        .sort(function(a, b) { return b.value - a.value; });

    // For efficiency, filter nodes to keep only those large enough to see.
    var nodes = vis.partition(root).descendants()
        .filter(function(d) {
            return (d.x1 - d.x0 > 0.005); // 0.005 radians = 0.29 degrees
        });

    console.log(json);

    vis.path = vis.svg.data([json]).selectAll("path")
        .data(nodes)
        .enter()
        .append("svg:path")
            .attr("display", function(d) { return d.depth ? null : "none"; })
            .attr("d", vis.arc)
            .attr("fill-rule", "evenodd")
            .style("fill", function(d) { return vis.colors[d.data.name]; })
            .style("opacity", 1)
            .on("mouseover", mouseover);

    // Add the mouseleave handler to the bounding circle.
    d3.select("#container").on("mouseleave", mouseleave);

    // Get total size of the tree = value of root node from partition.
    totalSize = vis.path.datum().value;
}


Sunburst.prototype.initializeBreadcrumbTrail = function() {
    var vis = this;

    // Add the svg area.
    var trail = d3.select("#sequence").append("svg:svg")
        .attr("width", vis.width)
        .attr("height", 50)
        .attr("id", "trail");

    // Add the label at the end, for the percentage.
    trail.append("svg:text")
        .attr("id", "endlabel")
        .style("fill", "#000");
}

// Generate a string that describes the points of a breadcrumb SVG polygon.
Sunburst.prototype.breadcrumbPoints = function(d, i) {
    const tipWidth = 10;
    const points = [];
    points.push("0,0");
    points.push(`${breadcrumbWidth},0`);
    points.push(`${breadcrumbWidth + tipWidth},${breadcrumbHeight / 2}`);
    points.push(`${breadcrumbWidth},${breadcrumbHeight}`);
    points.push(`0,${breadcrumbHeight}`);
    if (i > 0) {
        // Leftmost breadcrumb; don't include 6th vertex.
        points.push(`${tipWidth},${breadcrumbHeight / 2}`);
    }
    return points.join(" ");
}

// Update the breadcrumb trail to show the current sequence and percentage.
Sunburst.prototype.updateBreadcrumbs = function(nodeArray, percentageString) {
    var vis = this;

    // Data join; key function combines name and depth (= position in sequence).
    var trail = d3.select("#trail")
        .selectAll("g")
        .data(nodeArray, function(d) { return d.data.name + d.depth; });

    // Remove exiting nodes.
    trail.exit().remove();

    // Add breadcrumb and label for entering nodes.
    var entering = trail.enter().append("svg:g");

    entering.append("svg:polygon")
        .attr("points", vis.breadcrumbPoints)
        .style("fill", function(d) { return colors[d.data.name]; });

    entering.append("svg:text")
        .attr("x", (b.w + b.t) / 2)
        .attr("y", b.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(function(d) { return d.data.name; });

    // Merge enter and update selections; set position for all nodes.
    entering.merge(trail).attr("transform", function(d, i) {
        return "translate(" + i * (b.w + b.s) + ", 0)";
    });

    // Now move and update the percentage at the end.
    d3.select("#trail").select("#endlabel")
        .attr("x", (nodeArray.length + 0.5) * (b.w + b.s))
        .attr("y", b.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(percentageString);

    // Make the breadcrumb trail visible, if it's hidden.
    d3.select("#trail")
        .style("visibility", "");
};


// Take a 2-column CSV and transform it into a hierarchical structure suitable
// for a partition layout. The first column is a sequence of step names, from
// root to leaf, separated by hyphens. The second column is a count of how
// often that sequence occurred.
function buildHierarchy(csv) {
    // Helper function that transforms the given CSV into a hierarchical format.
    const root = { name: "root", children: [] };
    for (let i = 0; i < csv.length; i++) {
        const sequence = csv[i][0];
        const size = +csv[i][1];
        if (isNaN(size)) {
            // e.g. if this is a header row
            continue;
        }
        const parts = sequence.split("-");
        let currentNode = root;
        for (let j = 0; j < parts.length; j++) {
            const children = currentNode["children"];
            const nodeName = parts[j];
            let childNode = null;
            if (j + 1 < parts.length) {
                // Not yet at the end of the sequence; move down the tree.
                let foundChild = false;
                for (let k = 0; k < children.length; k++) {
                    if (children[k]["name"] == nodeName) {
                        childNode = children[k];
                        foundChild = true;
                        break;
                    }
                }
                // If we don't already have a child node for this branch, create it.
                if (!foundChild) {
                    childNode = { name: nodeName, children: [] };
                    children.push(childNode);
                }
                currentNode = childNode;
            }
            else {
                // Reached the end of the sequence; create a leaf node.
                childNode = { name: nodeName, value: size };
                children.push(childNode);
            }
        }
    }
    return root;
}


// Fade all but the current sequence, and show it in the breadcrumb trail.
function mouseover(d) {

  var percentage = (100 * d.value / totalSize).toPrecision(3);
  var percentageString = percentage + "%";
  if (percentage < 0.1) {
    percentageString = "< 0.1%";
  }

  d3.select("#percentage")
      .text(percentageString);

  d3.select("#explanation")
      .style("visibility", "");

  var sequenceArray = d.ancestors().reverse();
  sequenceArray.shift(); // remove root node from the array
  vis.updateBreadcrumbs(sequenceArray, percentageString);

  // Fade all the segments.
  d3.selectAll("path")
      .style("opacity", 0.3);

  // Then highlight only those that are an ancestor of the current segment.
  vis.selectAll("path")
      .filter(function(node) {
                return (sequenceArray.indexOf(node) >= 0);
              })
      .style("opacity", 1);
}

// Restore everything to full opacity when moving off the visualization.
function mouseleave(d) {

  // Hide the breadcrumb trail
  d3.select("#trail")
      .style("visibility", "hidden");

  // Deactivate all segments during transition.
  d3.selectAll("path").on("mouseover", null);

  // Transition each segment to full opacity and then reactivate it.
  d3.selectAll("path")
      .transition()
      .duration(1000)
      .style("opacity", 1)
      .on("end", function() {
              d3.select(this).on("mouseover", mouseover);
            });

  d3.select("#explanation")
      .style("visibility", "hidden");
}
