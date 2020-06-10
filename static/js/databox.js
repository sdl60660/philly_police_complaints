
DataBox = function(_position, _dimensions) {
    this.position = _position;

    this.dimensions = _dimensions;
    // this.parentElement = _parentElement;
    
    this.members = [];
    this.sortFeature = 'complainant_race'; // default
}

DataBox.prototype.setSortFeature = function(_sortFeature) {
	this.sortFeature = _sortFeature;
}

DataBox.prototype.addMember = function(member) {
	this.members.push(member);

	this.sortBox();
}

DataBox.prototype.sortBox = function() {
	d3.selectAll(this.members)
}
