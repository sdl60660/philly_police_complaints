import csv
import json
import re

from datetime import datetime

from pprint import pprint


def find_prior_complaints(officer_id, data, data_index):
    if not officer_id:
        return None, None

    prior_complaint_ids = []
    prior_sustained_ids = []

    for complaint in data[:data_index]:
        if complaint['officer_id'] == officer_id:
            prior_complaint_ids.append(complaint['complaint_id'])

            if complaint['investigative_findings'] == 'Sustained Finding':
                prior_sustained_ids.append(complaint['complaint_id'])



    return len(list(set(prior_complaint_ids))), len(list(set(prior_sustained_ids)))


with open('raw_data/ppd_complaint_disciplines.csv', 'r') as f:
    disciplines = {x['officer_complaint_id']: dict(x) for x in csv.DictReader(f) if x['officer_id'] or x['officer_initials']}

with open('raw_data/ppd_complaints.csv', 'r', encoding="utf-8") as f:
    complaints = {x['complaint_id']: dict(x) for x in csv.DictReader(f)}

with open('raw_data/ppd_complainant_demographics.csv', 'r', encoding="utf-8") as f:
    complainants = [dict(x) for x in csv.DictReader(f)]

# Create arrays of complainants by complaint_id for cases where there is more than one complainant.
# This will allow us to consolidate demographic data where necessary.
complainant_demo_data = {}
for complainant in complainants:
    complainant_demo_data[complainant['complaint_id']] = [complainant] + complainant_demo_data.get(
        complainant['complaint_id'], [])

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

                if not default_details['complainant_age'] or (
                        person['complainant_age'] and person['complainant_age'] > default_details['complainant_age']):
                    default_details['complainant_age'] = person['complainant_age']

            v = {**v, **default_details}

    except KeyError:
        v = {**v, **{'complainant_race': '', 'complainant_sex': '', 'complainant_age': ''}}

    v['general_cap_classification'] = v['general_cap_classification'].title()

    disciplines[k] = v

out_data = sorted(disciplines.values(), key=lambda x: datetime.strptime(x['date_received'], '%m/%d/%y'))
for i, complaint in enumerate(out_data):
    # print(complaint['officer_id'])
    out_data[i]['officer_prior_complaints'], out_data[i]['officer_prior_sustained_complaints']  = find_prior_complaints(complaint['officer_id'], out_data, i)

    # Parse incident time out of complaint summary
    match = re.search(r'(\d+-\d+-\d+) at \d+:\d+\s?(?:AM|PM|am|pm)', complaint['shortened_summary'])
    if match:
        try:
            out_data[i]['incident_time'] = str(datetime.strptime(match.group(), '%m-%d-%y at %I:%M%p'))
        except ValueError:
            out_data[i]['incident_time'] = None
    else:
        out_data[i]['incident_time'] = None

with open('static/data/complaint_discipline_viz_data.json', 'w') as f:
    json.dump(out_data, f)
