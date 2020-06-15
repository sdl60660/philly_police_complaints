import csv
import json

from pprint import pprint


with open('ppd_complaint_disciplines.csv', 'r') as f:
	disciplines = {x['officer_complaint_id']: dict(x) for x in csv.DictReader(f) if x['officer_id']}


with open('ppd_complaints.csv', 'r') as f:
	complaints = {x['complaint_id']: dict(x) for x in csv.DictReader(f)}


with open('ppd_complainant_demographics.csv', 'r') as f:
	complainants = [dict(x) for x in csv.DictReader(f)]


# Create arrays of complainants by complaint_id for cases where there is more than one complainant.
# This will allow us to consolidate demographic data where necessary.
complainant_demo_data = {}
for complainant in complainants:
	complainant_demo_data[complainant['complaint_id']] = [complainant] + complainant_demo_data.get(complainant['complaint_id'], [])

# pprint(complainant_demo_data)

# The "unit" here is not complaints, but complaints against officers. These are often one-to-one, but not always.
# This needs to be kept in mind when determining what factors were important in a result, but there's no way around this
# as there are sometimes different disciplinary actions taken against different officers, and for the purposes of a visualization, this should be fine.

overlap = 0
for k, v in disciplines.items():
	v = {**v, **complaints[v['complaint_id']]}

	try:
		case_complainants = complainant_demo_data[v['complaint_id']]
		if len(case_complainants) == 1:
			v = {**v, **case_complainants[0]}
		else:
			default_details = case_complainants[0]

			for person in case_complainants[1:]:
				if person['complainant_race'] != default_details['complainant_race']:
					default_details['complainant_race'] = '[multiple complainants of different races]'

				if person['complainant_sex'] != default_details['complainant_sex']:
					default_details['complainant_sex'] = '[multiple complainants of different genders]'

				if default_details['complainant_age'] == None or (person['complainant_age'] and person['complainant_age'] > default_details['complainant_age']):
					default_details['complainant_age'] = person['complainant_age']

			v = {**v, **default_details}

	except KeyError:
		v = {**v, **{'complainant_race': '', 'complainant_sex': '', 'complainant_age': ''}}

	v['general_cap_classification'] = v['general_cap_classification'].title()

	disciplines[k] = v



with open('static/data/complaint_discipline_viz_data.json', 'w') as f:
	json.dump(list(disciplines.values()), f)


