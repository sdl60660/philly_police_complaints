import json
import csv

from pprint import pprint


with open('../raw_data/ppd_complaint_disciplines.csv', 'r') as f:
    disciplines = {x['discipline_id']: dict(x) for x in csv.DictReader(f) if x['officer_id'] or x['officer_initials']}

with open('../raw_data/ppd_complaints.csv', 'r', encoding="utf-8") as f:
    complaints = {x['complaint_id']: dict(x) for x in csv.DictReader(f)}

with open('../raw_data/ppd_complainant_demographics.csv', 'r', encoding="utf-8") as f:
    complainants = [dict(x) for x in csv.DictReader(f)]

with open('../raw_data/district_data.csv', 'r', encoding="utf-8") as f:
    districts = {x['district']: dict(x) for x in csv.DictReader(f)}

district_data = {}
for complaint_id, complaint in complaints.items():
	complaint_type = complaint['general_cap_classification'].title()

	relevant_disciplinary_results = [x for x in disciplines.values() if x['complaint_id'] == complaint_id and x['allegations_investigated'] == complaint_type]
	sustained_results = [x for x in relevant_disciplinary_results if x['investigative_findings'] == 'Sustained Finding']

	if len(sustained_results) > 0:
		disciplinary_outcome = 1
	else:
		disciplinary_outcome = 0

	district_outcomes = district_data.get(complaint['district_occurrence'], {'total_complaints': 0, 'total_sustained': 0 })
	
	district_outcomes['total_complaints'] += 1
	district_outcomes['total_sustained'] += disciplinary_outcome
	district_outcomes['rate_sustained'] = district_outcomes['total_sustained'] / district_outcomes['total_complaints']

	district_data[complaint['district_occurrence']] = district_outcomes

pprint(district_data)