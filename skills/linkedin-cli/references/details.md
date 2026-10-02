# Linkedin Cli — Code Reference

## ## Output Format

```

Exit code 0 means the API call succeeded – always check the `success` field for the action outcome. Non-zero exit codes indicate infrastructure errors:

| Exit Code | Meaning                                                                                     |
| --------- | ------------------------------------------------------------------------------------------- |
| 0         | Success (check `success` field – action may have returned an error like "person not found") |
| 1         | General/unexpected error                                                                    |
| 2         | Missing or invalid tokens                                                                   |
| 3         | Subscription/plan required                                                                  |
| 4         | LinkedIn account issue                                                                      |
| 5         | Invalid arguments                                                                           |
| 6         | Rate limited                                                                                |
| 7         | Network error                                                                               |
| 8         | Workflow timeout (workflowId returned for recovery)                                         |

## Commands

### Fetch a Person Profile

```bash


## ### Search People

| Flag                   | Description                            |
| ---------------------- | -------------------------------------- |
| `--term`               | Search keyword or phrase               |
| `--limit`              | Max results                            |
| `--first-name`         | Filter by first name                   |
| `--last-name`          | Filter by last name                    |
| `--position`           | Filter by job position                 |
| `--locations`          | Comma-separated locations              |
| `--industries`         | Comma-separated industries             |
| `--current-companies`  | Comma-separated current company names  |
| `--previous-companies` | Comma-separated previous company names |
| `--schools`            | Comma-separated school names           |


## ### Fetch a Company

```

Optional flags:

- `--employees` – include employees
- `--dms` – include decision makers
- `--posts` – include company posts

Employee filters (require `--employees`):

| Flag                     | Description                  |
| ------------------------ | ---------------------------- |
| `--employees-limit`      | Max employees to retrieve    |
| `--employees-first-name` | Filter by first name         |
| `--employees-last-name`  | Filter by last name          |
| `--employees-position`   | Filter by position           |
| `--employees-locations`  | Comma-separated locations    |
| `--employees-industries` | Comma-separated industries   |
| `--employees-schools`    | Comma-separated school names |

| Flag            | Description                                        |
| --------------- | -------------------------------------------------- |
| `--dms-limit`   | Max decision makers to retrieve (requires `--dms`) |
| `--posts-limit` | Max posts to retrieve (requires `--posts`)         |
| `--posts-since` | Posts since ISO timestamp (requires `--posts`)     |

```bash


## #### List connections

| Flag                   | Description                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `--limit`              | Max connections to return                                                            |
| `--since`              | Only connections made since ISO timestamp (only works when no filter flags are used) |
| `--first-name`         | Filter by first name                                                                 |
| `--last-name`          | Filter by last name                                                                  |
| `--position`           | Filter by job position                                                               |
| `--locations`          | Comma-separated locations                                                            |
| `--industries`         | Comma-separated industries                                                           |
| `--current-companies`  | Comma-separated current company names                                                |
| `--previous-companies` | Comma-separated previous company names                                               |
| `--schools`            | Comma-separated school names                                                         |


## #### Search people

| Flag                    | Description                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| `--term`                | Search keyword or phrase                                                                    |
| `--limit`               | Max results                                                                                 |
| `--first-name`          | Filter by first name                                                                        |
| `--last-name`           | Filter by last name                                                                         |
| `--position`            | Filter by job position                                                                      |
| `--locations`           | Comma-separated locations                                                                   |
| `--industries`          | Comma-separated industries                                                                  |
| `--current-companies`   | Comma-separated current company names                                                       |
| `--previous-companies`  | Comma-separated previous company names                                                      |
| `--schools`             | Comma-separated school names                                                                |
| `--years-of-experience` | Comma-separated ranges: `lessThanOne`, `oneToTwo`, `threeToFive`, `sixToTen`, `moreThanTen` |


## #### Fetch company

```

Optional flags:

- `--employees` – include employees
- `--dms` – include decision makers

Employee filters (require `--employees`):

| Flag                              | Description                                        |
| --------------------------------- | -------------------------------------------------- |
| `--employees-limit`               | Max employees to retrieve                          |
| `--employees-first-name`          | Filter by first name                               |
| `--employees-last-name`           | Filter by last name                                |
| `--employees-positions`           | Comma-separated positions                          |
| `--employees-locations`           | Comma-separated locations                          |
| `--employees-industries`          | Comma-separated industries                         |
| `--employees-schools`             | Comma-separated school names                       |
| `--employees-years-of-experience` | Comma-separated experience ranges                  |
| `--dms-limit`                     | Max decision makers to retrieve (requires `--dms`) |

```bash


