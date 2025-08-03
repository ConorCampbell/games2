import json

with open('static/countries.json', 'r', encoding='utf-8') as f:
    countries = json.load(f)


with open('static/countries2.json', 'r', encoding='utf-8') as f:
    countries2 = json.load(f)

print("Loaded countries from JSON files.")
print(len(countries), "countries loaded from countries.json")
print(len(countries2), "countries loaded from countries2.json")

print("Merging countries...")
for country in countries:  

    # just print the country name
    name = country['name']
    # print(f"Processing country: {name}")

    #iterate through the list of coutrnies2
    for country2 in countries2:
        # if the name of the country in countries2 matches the name of the country in countries
        if country2['name'] == name:
            # merge the two countries
            country['capital'] = country2.get('capital', "")
            country['region'] = country2.get('timezones', [])[0].split('/')[0] if country2.get('timezones') else ""
            break


    # find the country in countries2



#     if country not in countries:
#         countries[country] = countries2[country]
#     else:
#         for key, value in countries2[country].items():
#             if key not in countries[country]:
#                 countries[country][key] = value
#             elif isinstance(countries[country][key], list) and isinstance(value, list):
#                 countries[country][key].extend(value)

# # Save the merged countries to a new JSON file
with open('static/merged_countries.json', 'w', encoding='utf-8') as f:
    json.dump(countries, f, ensure_ascii=False, indent=4)
