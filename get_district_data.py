import json
import csv

with open('district_demos.geojson', 'r') as f:
	data = json.load(f)


rows = []
districts = data['features']

for x in districts:
	district = x['properties']
	rows.append({'district': district['DIST_NU'], 'pct_black': district['pct_bl_'], 'median_district_income': district['md_hh_2'], 'total_district_population': district['pop_sum']})

with open('raw_data/district_data.csv', 'w') as f:
	out_csv = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
	out_csv.writeheader()
	for row in rows:
		out_csv.writerow(row)