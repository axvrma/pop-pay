# Demo mode

`/demo` routes to a populated merchant overview without signup. The fictional businesses and people are fixed: Sharma Kirana Store, Urban Brew Café and CityStyle Boutique. Seed records have stable IDs, integer paise and a mix of pending, declined, active, partially repaid, settled and overdue credit. Dates are relative to the installation or reset date; refreshing does not shift them. Derived analytics reflect the current business date.

Merchant selection is an optional local preference; each workspace has isolated records. The customer switcher presents a fictional customer's view of the same ledger. Neither switcher authenticates anyone or imposes a security boundary.

IndexedDB is the source of truth. If storage cannot open or initialize, the interface uses an explicitly labeled temporary demo, with no persistence or synchronization across tabs. A storage write that fails after initialization shows an error instead of switching stores or claiming success. If a saved record fails validation, the reset screen offers explicit recovery.

Reset restores all three sample ledgers, clears notes, reminder overrides and assistant view state, changes the revision and returns to the default merchant. Theme preference is kept. Storage remains confined to the browser, origin and browser profile.
