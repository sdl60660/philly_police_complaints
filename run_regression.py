import json
from datetime import datetime

import pandas as pd
import numpy as np

import sklearn
from sklearn.linear_model import LogisticRegression
from sklearn.feature_selection import RFE
from sklearn.model_selection import train_test_split

from imblearn.over_sampling import SMOTE


categorical_cols = ['complainant_race', 'complainant_sex', 'po_race', 'po_sex', 'general_cap_classification']
non_categorical_cols = ['officer_prior_complaints', 'officer_prior_sustained_complaints', 'complainant_age'] # 'district_median_income'

# print(len([x for x in data if x['incident_time']]))

def build_dataframe(data):
    dataset = []

    for row in data:
        dataset_row = {}

        if row['investigative_findings'] == 'No Sustained Findings':
            dataset_row['investigative_outcome'] = 0
        elif row['investigative_findings'] == 'Sustained Finding':
            dataset_row['investigative_outcome'] = 1
        else:
            continue

        if all([x in list(row.keys()) and row[x] != '' for x in (categorical_cols + non_categorical_cols)]):
            for col in (categorical_cols + non_categorical_cols):
                dataset_row[col] = row[col]

            dataset_row['month_of_year'] = datetime.strptime(row['date_received'], '%m/%d/%y').month

            dataset.append(dataset_row)

    df = pd.DataFrame(dataset)
    return df


def encode_categoricals(df):
    for col in categorical_cols:
        # Find values for the categorical columns that are represented in at least 15 samples in the minority group
        threshold_vals = list(df[df['investigative_outcome']==1][col]
                      .value_counts()
                      .reset_index(name="count")
                      .query("count > 15")["index"])

        df[col] = df[col].apply(lambda x: x if x in threshold_vals and '[' not in x else 'other')

    df = pd.get_dummies(df, columns=categorical_cols)

    # Remove any "other" columns from the encoding, as well as the original categorical columns
    other_cols = [col for col in df.columns if '_other' in col]
    df = df.drop(other_cols, axis=1)

    return df


def oversample(X, y):
    os = SMOTE(random_state=0)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=0)
    columns = X_train.columns

    os_data_X, os_data_y = os.fit_sample(X_train, y_train)
    os_data_X = pd.DataFrame(data=os_data_X, columns=columns)
    os_data_y = pd.DataFrame(data=os_data_y, columns=['investigative_outcome'])

    return os_data_X, os_data_y


def main():

    with open('static/data/complaint_discipline_viz_data.json', 'r') as f:
        data = json.load(f)
        df = build_dataframe(data)

    df = encode_categoricals(df)

    # print(len(df.columns))
    X = df.loc[:, df.columns != 'investigative_outcome']
    y = df.loc[:, df.columns == 'investigative_outcome']

    print(len(X), len(y))
    os_data_X, os_data_y = oversample(X, y)
    print(len(os_data_y[os_data_y['investigative_outcome']==0]), len(os_data_y[os_data_y['investigative_outcome']==1]))

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=0)

    logreg = LogisticRegression()

    rfe = RFE(logreg, 15)
    rfe = rfe.fit(os_data_X, os_data_y.values.ravel())
    print(rfe.support_)
    print(rfe.ranking_)
    print(os_data_X.columns)

    import statsmodels.api as sm
    logit_model = sm.Logit(y.astype(float), X.astype(float))
    result = logit_model.fit()
    print(result.summary2())

    logit_model = sm.Logit(os_data_y.astype(float), os_data_X.astype(float))
    result = logit_model.fit()
    print(result.summary2())

if __name__ == "__main__":
    main()