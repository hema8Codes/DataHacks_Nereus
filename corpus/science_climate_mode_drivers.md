# Climate-mode drivers of marine heatwaves

## The three indices that matter for MHW forecasting

**ONI (El Niño / La Niña):** positive phase strongly associated with Pacific MHWs; the Chile 2016 event occurred at ONI +2.21.

**PDO (Pacific Decadal Oscillation):** positive phase amplifies warm anomalies in the NE Pacific. The Blob sustained a PDO of approximately +0.75 for its entire duration.

**NAO (North Atlantic Oscillation):** weaker but non-trivial signal for North Atlantic events.

## Combined signatures
No single climate mode predicts MHWs. Combinations matter:

- Strong ONI + positive PDO → elevated risk for Chilean and Peruvian coasts (the Chile 2016 signature)
- Neutral ONI + sustained positive PDO → classic Blob-type NE Pacific heatwave
- Weak climate-mode signal → atmospheric blocking likely the primary driver (Mediterranean 2022, N. Atlantic 2023)

## Nereus implementation
Each HeatwaveEvent record in the Nereus catalog carries ONI / PDO / NAO / AMO values at event-onset month, computed from NOAA PSL monthly indices. Analog-event search uses these values as part of the event feature vector, so "find events with a similar climate-mode configuration" is a one-API-call operation.

## Open science
Climate-mode drivers of MHWs remain an active research frontier. Recent 2023 North Atlantic event suggests aerosol forcing and AMOC state may be underappreciated drivers.
