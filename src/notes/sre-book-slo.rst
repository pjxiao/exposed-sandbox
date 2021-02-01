My note of `Chater 4 of the SRE book <https://sre.google/sre-book/service-level-objectives/>`_

Service Level Objectives
========================

* Identifying which behaviours of a system, measure and evaluate them is crucial to run the system correctly
* They defined and delivered a *level of service* to their users

* Three service level measurements:

   * *indicators* (SLIs)
   * *objectives* (SLOs)
   * *agreements* (SLAs)

* By choosing appropriate metrics, we can react with confidence when something goes wrong.
* The framework described in this chapter deals with:

   * metric modeling
   * metric selection
   * metric analysis

Service Level Terminology
--------------------------

* Though some of us've been familiar with *SLA*, it is ambiguous what *SLA* is.
* They separated *SLA* into three concepts (*SLI*, *SLO* and *SLA*) to clarity its meanign.

Indicators (SLIs)
--------------------------

* An SLI is a measure of the level of a service from a certain point of view.
* Typical measures:

   * request latency
   * error rate
   * system throughput
   * availability
   * yield: the fraction of well-formed requests that succeed
   * durability: the likelihood that data will be retained over a long period of time

* Measurements may be aggregated within a mesurement window
  using aggregation functions such as averate, rate or percentile.
* When it is sometimes hard to mesure metrics directly,
  there may exist some indirect (proxy) mesures.

   * For example, client-side latency is often the more user-relevant metric,
     but it might only be possible to measure latency at the server.

* Again, 100% availability is unicorn idea but near-100% availability is not.


Objectives
--------------------------

* An SLO is a *service level objective*
* An SLO is a target value or range of a service level mesured by an SLI
* An SLO contrains is:

   * SLI <= trget or
   * lower bound <= SLI <= upper bound

* It's complicated to choose a proper SLO

   * As a QPS (queries/sec) is determined by (the number of) users,
     we can't set an SLO for that.
   * Instead, we can set an SLO for the average latency per request
   * QPS and latency are correlated

* Publishing choosed SLOs to users

   * This tell users how well they can expect to the service perform
   * This can reduce users' too much expectations
   * Otherwise, the users incorrectly believe that service will be more available that actual it is

Agreements
--------------------------

* An SLO is a *service level agreement*
* an SLA is an explicit/implicit contract
* The difference between an SLO and an SLA is
  whether a consequence of missing an SLO is included or not
* As SLAs are tightly coupled with business,
  SREs don't construt SLAs but they help to:

  * avoid missing SLOs
  * definie SLIs

* In Google

  * Google Search doesn't have SLAs
  * Google wfor Work does

* Defining SLIs and SLOs is valuable to run our services.

Indicators in Practice
=======================

* How can we define meaningful metrics?

What Do You and Your Users Care About?
-----------------------------------------------

* We shouldn't use all metrics we can monitor.
* Instead, choose a few meaningful metrics.
* We may not be able to care too many metrics.
* Too few metrics can lead a system to unexpected behaviours.
* Thus, we should use a handful of representative metrics are enough to evaluate and reason about a system's health.
* Typical service categories and their SLIs

  * User-facing serving systems:
  
    * availability
    * latency
    * throughput

  * Storage systems

    * latency
    * availability
    * durability

  * Big data systems

    * throughput
    * end-to-end latency

  * All systems

    * correctness
    * Correctness essentially depends on the system rather than the infrastructure
    * SREs usually aren't responsible to correctness

Collecting Indicators
--------------------------

* Many indicator metrics come from the *server*-side using a monitoring system or log analysis
* Some metrics which doesn't affect server-side metrics come from the *client*-side

  * e.g. Poor latency caused by JavaScript

Aggregation
--------------------------

.. figure:: https://lh3.googleusercontent.com/G-Ljl-lx35hRTILL9pwj-ty2S5KE8piLPmx4wZSoaLpnfvw4WgdseYm-X5ZPCMNZS01eJmyZFwjHL4yK3ptj6WglYlX20Oi3dxA=s900
   :alt: Fig 4-1. 5% of requests are 20 times slower than the average.

* Aggregation must be done carefully.
* Measurements are aggregated over the mesurement window.

  * Is the measurement obtained once a second, or by averaging requests over a minute?

* Average may hide spikes.
* Example:

  * 200 requests/s in even-numbered seconds
  * Otherwise 0 in the others
  * then the average is 100 requests/s

* Consider *distributions* rather than average
* Using percentiles for indicators shows the shape of their distributions.

  * Higher percentiles (like 99th or 99.th) shows worst-case values
  * the 50th percentile shows the typical case

* Users prefer a slightly slower systems rather than high variance in response time.

A Note on Statistical Fallacies
---------------------------------

* They prefer to use percentiles  rather than average
* Indicators are often skewed, are not normally distributed.

Standardize Indicators
---------------------------------

* Standardisation of definitions of SLIs are recommend.
* Standardisation save effort and allow us easy understanding
* e.g.

  * aggregation intervals: 1min.
  * aggregation regions: all the tasks in a cluster
  * measurement frequencies: every 10 sec.
  * included requests: HTTPS GETs from black-box monitoring jobs
  * How the data is acquired: Through our monitoring, measured at the server
  * Data-access latency: Time to last byte

Objectives in Practice
=============================

* Don't start with what we can measure not to set useless objectives
* Start with what desired objectives are

Defining Objectives
---------------------------------

* SLOs should specify:

  * how to measure
  * the condition under which the SLOs are valid

* Examples:

  * 99% of GET RPC calls will complete in < 100 ms.
  * or 

    * 90% of GET PRC calls will complete in < 1 ms.
    * 99% of GET PRC calls will complete in < 10 ms.
    * 99.9% of GET PRC calls will complete in < 100 ms.

  * using throughput for a bulk processing pipeline

    * 95% of throughput clients' Set RPC calls will complete in < 1 s.

* Again, it's not unrealistic and undesirable idea to stick to 100%
* Allowing missing SLOs within an error budget is better.
* The SLO violation rate can be compared against the error budget (see Motivation for Error Budgets)


Choosing Targets (SLOs)
---------------------------------

* Because business implications and constraints affect SLOs (, SLIs and SLAs), choosing SLOs is not a purely technical job.
* SREs can advice on the risks and viability of options, taking part in the conversion.
* Use SLOs wisely, otherwise SLOs'd require heroic efforts or lead to a bad product
* Helpful lessons

  * Don't pick a target based on current performance:

    * Adopting a value based on current value without consideration
      may require huge effort for you to support the system

  * Keep it simple

    * Complex metrics make it harder to change system performance and reason about it

  * Avoid absolutes

    * 'always' available 'inifinite' scale without latency is unrealistic. 

  * Have as few SLOs as possible

    * Choose the enough number of SLOs which represent our systems
    * Defend the SLOs you pick, and if you loose prioritisation, having SLOs is meaningless
    * Sometimes, it is hard to set 'user delight' SLOs

  * Perfection can wait

    * We can aloways change SLO
    * Start with a loose target

Control Measures
---------------------------------

* We can't take any actions without SLOs

::

  Input: SLOs

  while True:
      SLIs <- monitor and measure the system's SLIs
      if (SLIs.miss(SLOs) and (action is needed))
          action <- figure out *what* to do to meet the target
          take(action)

SLOs Set Expectations
---------------------------------

* Publishing SLOs lets users know if the system is appropriate for ther use case.
* To make users set realistic expectations, Adopt one or both of these tactics:

  * Keep a safety margin

    * Set a tighter internal SLO than published SLOs
    * This margin give us time to respond to the problems before disclosed

  * Don't overachieve

    * Users count on what we offer rather than what we promise to offer.
    * Throttling requests and taking the system offline sometimes
      avoid over-dependencies

Agreements in Practice
===============================

* Business and leagal teames set appropriate consequences of missing SLOs
* SREs convince them of the likelihood and difficulty of meeting the SLOs.
* Be conservative to craft SLAs
* It becomes harder to change/delete SLAs when the number of users increase
