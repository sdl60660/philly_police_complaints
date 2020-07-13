import json
import csv


classification_data = {}

with open('../static/data/complaint_discipline_viz_data.json', 'r') as f:
	investigation_data = json.load(f)


for investigation in investigation_data:
	cap_classification = classification_data.get(investigation['general_cap_classification'], {})
	cap_classification[investigation['allegations_investigated']] = cap_classification.get(investigation['allegations_investigated'], 0) + 1
	classification_data[investigation['general_cap_classification']] = cap_classification

all_complaint_classifications = list(classification_data.keys())

all_investigation_classifications = []
for data in classification_data.values():
	for investigation_type in data.keys():
		if investigation_type not in all_investigation_classifications:
			all_investigation_classifications.append(investigation_type)


with open('../investigation_classification_matrix.csv', 'w') as f:
	out_csv = csv.DictWriter(f, fieldnames=(['Original Complaint Type'] + all_investigation_classifications))
	out_csv.writeheader()

	for k,v in classification_data.items():
		v['Original Complaint Type'] = k
		out_csv.writerow(v)

