A tracker for the github actions for as many repos as you want.
This tries to do the sensible thing to accomodate for github rate limits.
This should be useable by the Enterprise, we never do anything with your PAT.

# Why

In my day job, I manage a lot of pipelines, especially to handle scheduled jobs.
This helps surface the status of all those pipelines.
Also it is nice for managing non-day-job work.

# TODO

## UI
* Remove margins on job steps display
* Retain expand state by run_id in UI_STATE
* Add transition-name so that sorting will lerp old slot to new slot
* Make design prettier
* Add padding between workflows
* Change PAT help message to popup explaining you only need a read access PAT

## Code Architecture
* Think about how to make tests for UI behvaiours
* Add save PAT to localstorage? This is not secure against xss
* Extract a platform layer to expand to CI/CD platforms

