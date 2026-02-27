<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-sm font-black uppercase tracking-widest text-zinc-700">All Loads</h3>
      <button
        type="button"
        class="rounded border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        @click="toggleShowAll"
      >
        {{ showAllMode ? 'Apply 30-Day Filter' : 'Show All' }}
      </button>
    </header>

    <div class="grid grid-cols-1 gap-2 rounded-xl border border-zinc-200 bg-white/50 p-3 md:grid-cols-3 lg:grid-cols-8 dark:border-zinc-800 dark:bg-zinc-900/20">
      <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-700">
        Search
        <input v-model="search" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900" placeholder="Ref/customer/city" />
      </label>
      <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-700">
        Customer
        <select v-model="selectedCustomer" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900">
          <option value="">All</option>
          <option v-for="customer in customerOptions" :key="customer" :value="customer">{{ customer }}</option>
        </select>
      </label>
      <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-700">
        Account Manager
        <select v-model="selectedAccountManager" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900">
          <option value="">All</option>
          <option v-for="manager in accountManagerOptions" :key="manager" :value="manager">{{ manager }}</option>
        </select>
      </label>
      <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-700">
        Dispatcher
        <select v-model="selectedDispatcher" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900">
          <option value="">All</option>
          <option v-for="dispatcher in dispatcherOptions" :key="dispatcher" :value="dispatcher">{{ dispatcher }}</option>
        </select>
      </label>
      <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-700">
        Status
        <select v-model="selectedStatus" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900">
          <option value="">All</option>
          <option v-for="status in statusOptions" :key="status" :value="status">{{ statusLabel(status) }}</option>
        </select>
      </label>
      <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-700">
        Date From
        <input v-model="dateFrom" type="date" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900" />
      </label>
      <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-700">
        Date To
        <input v-model="dateTo" type="date" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900" />
      </label>
      <div class="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700">
        <div class="text-[10px] font-bold uppercase tracking-widest text-zinc-700">Filter By</div>
        <div class="mt-1 inline-flex w-full rounded border border-zinc-300 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-900">
          <button
            type="button"
            class="w-1/2 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
            :class="dateMode === 'pu_date' ? 'bg-brand-red text-white' : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'"
            @click="dateMode = 'pu_date'"
          >
            PU
          </button>
          <button
            type="button"
            class="w-1/2 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
            :class="dateMode === 'del_date' ? 'bg-brand-red text-white' : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'"
            @click="dateMode = 'del_date'"
          >
            DEL
          </button>
        </div>
      </div>
    </div>

    <div v-if="groupedSections.length === 0" class="rounded-xl border border-zinc-200 bg-white/50 py-8 text-center text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/20">
      No records found.
    </div>

    <div class="space-y-3">
      <article
        v-for="section in groupedSections"
        :key="section.status"
        class="overflow-hidden rounded-xl border border-zinc-200 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/20"
      >
        <header class="flex items-center gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <button
            type="button"
            class="flex h-5 w-5 items-center justify-center rounded text-zinc-600 transition-transform duration-200 hover:text-zinc-700 dark:hover:text-zinc-200"
            :class="section.expanded ? '' : '-rotate-90'"
            :aria-label="section.expanded ? 'Collapse status group' : 'Expand status group'"
            @click="toggleStatusGroup(section.status)"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <h4 class="text-xs font-black uppercase tracking-widest text-zinc-700">{{ statusLabel(section.status) }}</h4>
          <span class="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-bold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">{{ section.count }}</span>
        </header>

        <transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div v-show="section.expanded">
            <div class="overflow-x-auto">
              <table class="min-w-full text-left text-xs">
                <thead class="bg-zinc-100/70 text-[10px] uppercase tracking-widest text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
                  <tr>
                    <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort('specs')">
                      Specs
                      <span v-if="activeSort.column === 'specs'" class="ml-1 text-[10px]">{{ activeSort.dir === 'asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort('am')">
                      A.M.
                      <span v-if="activeSort.column === 'am'" class="ml-1 text-[10px]">{{ activeSort.dir === 'asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort('customer')">
                      Customer
                      <span v-if="activeSort.column === 'customer'" class="ml-1 text-[10px]">{{ activeSort.dir === 'asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort('ref')">
                      Ref# &amp; McLeod#
                      <span v-if="activeSort.column === 'ref'" class="ml-1 text-[10px]">{{ activeSort.dir === 'asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort('route')">
                      Route
                      <span v-if="activeSort.column === 'route'" class="ml-1 text-[10px]">{{ activeSort.dir === 'asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort('dates')">
                      Dates
                      <span v-if="activeSort.column === 'dates'" class="ml-1 text-[10px]">{{ activeSort.dir === 'asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort('rate_rpm')">
                      Rate/RPM
                      <span v-if="activeSort.column === 'rate_rpm'" class="ml-1 text-[10px]">{{ activeSort.dir === 'asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort('disp_info')">
                      DISP Info
                      <span v-if="activeSort.column === 'disp_info'" class="ml-1 text-[10px]">{{ activeSort.dir === 'asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort('status')">
                      Status
                      <span v-if="activeSort.column === 'status'" class="ml-1 text-[10px]">{{ activeSort.dir === 'asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th class="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
                  <tr v-for="load in section.rows" :key="load.id" class="hover:bg-white/70 dark:hover:bg-zinc-800/30">
                    <td class="px-3 py-2">
                      <button
                        v-if="hasSpecs(load)"
                        type="button"
                        class="rounded px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:ring-blue-700 dark:hover:bg-blue-950/30"
                        @click="openSpecs(load)"
                      >
                        Specs
                      </button>
                      <span v-else class="text-zinc-300 dark:text-zinc-700">—</span>
                    </td>
                    <td class="px-3 py-2">{{ load.account_manager_name || '—' }}</td>
                    <td class="px-3 py-2">
                      <div>{{ load.customer_name || '—' }}</div>
                      <div class="text-[10px] text-zinc-600">{{ customerType(load) }}</div>
                    </td>
                    <td class="px-3 py-2">
                      <div>{{ load.load_ref_number || '—' }}</div>
                      <div v-if="load.mcleod_order_id" class="text-[10px] text-zinc-600">McLeod: {{ load.mcleod_order_id }}</div>
                    </td>
                    <td class="px-3 py-2">
                      <div class="space-y-0.5 text-xs">
                        <div>{{ load.pu_city }}, {{ load.pu_state }}</div>
                        <div v-if="load.pu_zip" class="text-[10px] text-zinc-600">{{ load.pu_zip }}</div>
                        <div class="text-zinc-600">→</div>
                        <div>{{ load.del_city }}, {{ load.del_state }}</div>
                        <div v-if="load.del_zip" class="text-[10px] text-zinc-600">{{ load.del_zip }}</div>
                      </div>
                    </td>
                    <td class="px-3 py-2">
                      <div class="space-y-1 text-xs">
                        <div>PU: {{ formatDateDisplay(load.pu_date) || '—' }}</div>
                        <div
                          v-if="load.pu_appt && load.pu_appt_time && load.pu_appt_time !== 'Please, Set the APPT'"
                          class="rounded bg-green-100 px-1 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        >
                          {{ load.pu_appt_time }}
                        </div>
                        <div v-else-if="load.pu_appt" class="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          APPT Needed
                        </div>
                        <div>DEL: {{ formatDateDisplay(load.del_date) || '—' }}</div>
                        <div
                          v-if="load.del_appt && load.del_appt_time && load.del_appt_time !== 'Please, Set the APPT'"
                          class="rounded bg-green-100 px-1 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        >
                          {{ load.del_appt_time }}
                        </div>
                        <div v-else-if="load.del_appt" class="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          APPT Needed
                        </div>
                      </div>
                    </td>
                    <td class="px-3 py-2">
                      <div>${{ formatCurrency(load.rate) }} / ${{ formatCurrency(load.rpm) }}</div>
                      <div class="text-[10px] text-zinc-600">{{ formatMiles(load.miles) }} mi</div>
                    </td>
                    <td class="px-3 py-2">
                      <div v-if="load.driver_name || load.truck_number" class="text-xs">
                        <div>{{ load.driver_name || '—' }}</div>
                        <div v-if="load.truck_number" class="text-[10px] text-zinc-600">Truck#: {{ load.truck_number }}</div>
                      </div>
                      <div v-else>—</div>
                    </td>
                    <td class="px-3 py-2">
                      <span :class="statusBadge(load.status)">{{ load.status }}</span>
                    </td>
                    <td class="px-3 py-2 text-right">
                      <button
                        v-if="canEdit"
                        type="button"
                        class="rounded px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:ring-blue-700 dark:hover:bg-blue-950/30"
                        @click="openEditModal(load)"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </transition>
      </article>
    </div>

    <SpecsModal
      v-if="selectedLoadId"
      :notes="selectedSpecs"
      :editable="canEditSpecs"
      title="Load Specs"
      @close="closeSpecs"
      @save="saveSpecs"
    />

    <teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
        <div class="max-h-[90vh] w-full max-w-7xl overflow-auto rounded-xl bg-white p-4 shadow-xl dark:bg-zinc-900">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-bold">Edit Load — {{ editState.loadRefNumber || '—' }}</h4>
            <button type="button" class="text-sm text-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100" @click="closeEditModal">X</button>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div class="space-y-3">
              <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Customer
                <select v-model="editState.customerId" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950">
                  <option value="">Select Customer</option>
                  <option v-for="customer in customers" :key="customer.id" :value="customer.id">{{ customer.name }}</option>
                </select>
              </label>
              <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Load Ref #
                <input v-model="editState.loadRefNumber" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
              </label>
              <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                McLeod #
                <input v-model="editState.mcleodOrderId" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
              </label>
              <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Notes
                <textarea v-model="editState.notes" rows="4" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
              </label>
              <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                A.M.
                <select v-model="editState.accountManagerId" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950">
                  <option value="">Unassigned</option>
                  <option v-for="manager in accountManagerUsers" :key="manager.id" :value="manager.id">{{ manager.name }} ({{ manager.role }})</option>
                </select>
              </label>
            </div>

            <div class="space-y-3">
              <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                PU City
                <input v-model="editState.puCity" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
              </label>
              <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                PU State
                <input v-model="editState.puState" maxlength="2" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs uppercase dark:border-zinc-700 dark:bg-zinc-950" />
              </label>
              <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                PU ZIP
                <input v-model="editState.puZip" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
              </label>
              <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                PU Date
                <input v-model="editState.puDate" type="text" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
              </label>
              <label class="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <input v-model="editState.puAppt" type="checkbox" />
                PU APPT
              </label>
              <label v-if="editState.puAppt" class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                PU Appt Time
                <input
                  v-model="editState.puApptTime"
                  type="text"
                  maxlength="50"
                  placeholder="e.g. 08:00 or Dock 3"
                  class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
            </div>

            <div class="space-y-3">
              <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                DEL City
                <input v-model="editState.delCity" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
              </label>
              <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                DEL State
                <input v-model="editState.delState" maxlength="2" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs uppercase dark:border-zinc-700 dark:bg-zinc-950" />
              </label>
              <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                DEL ZIP
                <input v-model="editState.delZip" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
              </label>
              <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                DEL Date
                <input v-model="editState.delDate" type="text" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
              </label>
              <label class="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <input v-model="editState.delAppt" type="checkbox" />
                DEL APPT
              </label>
              <label v-if="editState.delAppt" class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                DEL Appt Time
                <input
                  v-model="editState.delApptTime"
                  type="text"
                  maxlength="50"
                  placeholder="e.g. 08:00 or Dock 3"
                  class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
            </div>

            <div class="space-y-3">
              <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Rate ($)
                <input v-model.number="editState.rate" type="number" min="0" step="0.01" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
              </label>
              <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Miles
                <input v-model.number="editState.miles" type="number" min="0" step="1" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
              </label>
              <div class="rounded border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                RPM: ${{ editRpm }}
              </div>
              <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Dispatcher
                <select v-model="editState.assignedDispatcherId" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950">
                  <option value="">Select Dispatcher</option>
                  <option v-for="dispatcher in dispatcherUsers" :key="dispatcher.id" :value="dispatcher.id">{{ dispatcher.name }}</option>
                </select>
              </label>
              <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Driver Name
                <input v-model="editState.driverName" type="text" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
              </label>
              <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Truck #
                <input v-model="editState.truckNumber" type="text" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
              </label>
              <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Status
                <select v-model="editState.status" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950">
                  <option v-for="status in allStatuses" :key="status" :value="status">{{ status }}</option>
                </select>
              </label>
            </div>
          </div>

          <div class="mt-4 flex justify-end gap-2">
            <button
              v-if="canDeleteLoads"
              type="button"
              class="mr-auto rounded bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="deletingLoad"
              @click="deleteCurrentLoad"
            >
              {{ deletingLoad ? 'Deleting...' : 'Delete Load' }}
            </button>
            <button type="button" class="rounded bg-zinc-200 px-3 py-1.5 text-xs font-semibold dark:bg-zinc-700" @click="closeEditModal">Cancel</button>
            <button type="button" class="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800" @click="saveEdit">Save Changes</button>
          </div>
        </div>
      </div>
    </teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';
import { LOAD_STATUSES, type LoadStatus } from '@antigravity/shared';

import SpecsModal from '@/components/loads/SpecsModal.vue';
import { deleteLoad, updateLoad, type UpdateLoadPayload } from '@/api/freight';
import { useUiStore } from '@/stores/ui';
import type { CustomerRecord, LoadRecord, SessionUser, UserRecord } from '@/types/models';
import { formatDateDisplay } from '@/utils/dateFormat';

const STATUS_GROUP_ORDER: LoadStatus[] = ['AVAILABLE', 'COVERED', 'LOADED', 'DELAYED', 'BROKERAGE', 'DELIVERED', 'CANCELED', 'TONU'];

type SortColumn = 'specs' | 'am' | 'customer' | 'ref' | 'route' | 'dates' | 'rate_rpm' | 'disp_info' | 'status';
type SortDirection = 'asc' | 'desc';

const DEFAULT_SORT: { column: SortColumn; dir: SortDirection } = {
  column: 'dates',
  dir: 'desc',
};

const props = defineProps<{
  loads: LoadRecord[];
  customers: CustomerRecord[];
  users: UserRecord[];
  canEdit: boolean;
  currentUser: SessionUser | null;
}>();

const queryClient = useQueryClient();
const uiStore = useUiStore();

const today = new Date();
const thirtyDaysAgo = new Date(today);
thirtyDaysAgo.setDate(today.getDate() - 30);

const showAllMode = ref(true);
const search = ref('');
const selectedCustomer = ref('');
const selectedAccountManager = ref('');
const selectedDispatcher = ref('');
const selectedStatus = ref<LoadStatus | ''>('');
const dateMode = ref<'pu_date' | 'del_date'>('pu_date');
const dateFrom = ref('');
const dateTo = ref('');

const sortState = ref<{ column: SortColumn; dir: SortDirection }>({ ...DEFAULT_SORT });
const hasCustomSort = ref(false);

const statusExpanded = reactive<Record<LoadStatus, boolean>>(
  LOAD_STATUSES.reduce((accumulator, status) => {
    accumulator[status] = status === 'AVAILABLE';
    return accumulator;
  }, {} as Record<LoadStatus, boolean>),
);

const selectedLoadId = ref('');
const selectedSpecs = ref('');

const showEditModal = ref(false);
const editingLoad = ref<LoadRecord | null>(null);
const deletingLoad = ref(false);

const editState = reactive({
  customerId: '',
  accountManagerId: '',
  loadRefNumber: '',
  mcleodOrderId: '',
  notes: '',
  puCity: '',
  puState: '',
  puZip: '',
  puDate: '',
  puAppt: false,
  puApptTime: '',
  delCity: '',
  delState: '',
  delZip: '',
  delDate: '',
  delAppt: false,
  delApptTime: '',
  rate: 0,
  miles: 0,
  assignedDispatcherId: '',
  driverName: '',
  truckNumber: '',
  status: 'AVAILABLE' as LoadStatus,
});

const allStatuses = LOAD_STATUSES;

const scopedLoads = computed(() => {
  const user = props.currentUser;
  if (!user) {
    return [] as LoadRecord[];
  }

  if (user.role === 'ADMIN' || user.role === 'MANAGER') {
    return props.loads;
  }

  if (user.role === 'ACCOUNT_MANAGER') {
    return props.loads;
  }

  return [];
});

const filteredLoads = computed(() => {
  const term = search.value.trim().toLowerCase();
  const fromValue = toDateBoundary(dateFrom.value, 'start');
  const toValue = toDateBoundary(dateTo.value, 'end');

  return scopedLoads.value.filter((load) => {
    if (term) {
      const haystack = [load.load_ref_number, load.customer_name ?? '', load.pu_city, load.del_city].join(' ').toLowerCase();
      if (!haystack.includes(term)) return false;
    }

    if (selectedCustomer.value && load.customer_name !== selectedCustomer.value) return false;
    if (selectedAccountManager.value && load.account_manager_name !== selectedAccountManager.value) return false;
    if (selectedDispatcher.value && load.dispatcher_name !== selectedDispatcher.value) return false;
    if (selectedStatus.value && load.status !== selectedStatus.value) return false;

    const dateValue = dateMode.value === 'pu_date' ? toDateValue(load.pu_date) : toDateValue(load.del_date);
    if (fromValue !== null && (dateValue === null || dateValue < fromValue)) return false;
    if (toValue !== null && (dateValue === null || dateValue > toValue)) return false;

    return true;
  });
});

const activeSort = computed(() => (hasCustomSort.value ? sortState.value : DEFAULT_SORT));

const groupedSections = computed(() => {
  const grouped = new Map<LoadStatus, LoadRecord[]>();

  for (const load of filteredLoads.value) {
    if (!grouped.has(load.status)) {
      grouped.set(load.status, []);
    }
    grouped.get(load.status)!.push(load);
  }

  const orderedStatuses: LoadStatus[] = [
    ...STATUS_GROUP_ORDER.filter((status) => grouped.has(status)),
    ...[...grouped.keys()].filter((status) => !STATUS_GROUP_ORDER.includes(status)).sort(statusSortCompare),
  ];

  return orderedStatuses.map((status) => {
    const rows = sortLoads(grouped.get(status) ?? []);
    return {
      status,
      rows,
      count: rows.length,
      expanded: isStatusExpanded(status),
    };
  });
});

const customerOptions = computed(() =>
  [...new Set(scopedLoads.value.map((load) => load.customer_name).filter(Boolean) as string[])].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: 'base' }),
  ),
);

const accountManagerOptions = computed(() =>
  [...new Set(scopedLoads.value.map((load) => load.account_manager_name).filter(Boolean) as string[])].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: 'base' }),
  ),
);

const dispatcherOptions = computed(() =>
  [...new Set(scopedLoads.value.map((load) => load.dispatcher_name).filter(Boolean) as string[])].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: 'base' }),
  ),
);

const statusOptions = computed(() =>
  [...new Set(scopedLoads.value.map((load) => load.status))].sort(statusSortCompare),
);

const dispatcherUsers = computed(() => props.users.filter((user) => user.role === 'DISPATCHER'));

const accountManagerUsers = computed(() =>
  props.users.filter((user) => ['ADMIN', 'MANAGER', 'ACCOUNT_MANAGER'].includes(user.role)),
);

const canEditSpecs = computed(() => {
  const role = props.currentUser?.role;
  return role === 'ADMIN' || role === 'MANAGER' || role === 'ACCOUNT_MANAGER';
});

const canDeleteLoads = computed(() => {
  const role = props.currentUser?.role;
  return role === 'ADMIN' || role === 'MANAGER' || role === 'ACCOUNT_MANAGER';
});

const customerTypeById = computed(() => {
  const map = new Map<string, string>();
  for (const customer of props.customers) {
    map.set(customer.id, customer.type);
  }
  return map;
});

const editRpm = computed(() => {
  const rate = Number(editState.rate);
  const miles = Number(editState.miles);
  if (!Number.isFinite(rate) || !Number.isFinite(miles) || miles <= 0) {
    return '0.00';
  }
  return (rate / miles).toFixed(2);
});

function toggleShowAll(): void {
  showAllMode.value = !showAllMode.value;
  if (showAllMode.value) {
    dateFrom.value = '';
  } else {
    dateFrom.value = formatDate(thirtyDaysAgo);
  }
}

function toggleStatusGroup(status: LoadStatus): void {
  statusExpanded[status] = !isStatusExpanded(status);
}

function isStatusExpanded(status: LoadStatus): boolean {
  if (selectedStatus.value && selectedStatus.value === status) {
    return true;
  }
  return statusExpanded[status];
}

function cycleSort(column: SortColumn): void {
  if (!hasCustomSort.value) {
    hasCustomSort.value = true;
    sortState.value = {
      column,
      dir: 'asc',
    };
    return;
  }

  if (sortState.value.column !== column) {
    sortState.value = { column, dir: 'asc' };
    return;
  }

  if (sortState.value.dir === 'asc') {
    sortState.value = { column, dir: 'desc' };
    return;
  }

  hasCustomSort.value = false;
  sortState.value = { ...DEFAULT_SORT };
}

function sortLoads(rows: LoadRecord[]): LoadRecord[] {
  const sort = activeSort.value;

  return [...rows].sort((left, right) => {
    const cmp = compareSortValues(left, right, sort.column);
    if (cmp !== 0) {
      return sort.dir === 'asc' ? cmp : -cmp;
    }

    if (sort.column !== DEFAULT_SORT.column) {
      const fallback = compareSortValues(left, right, DEFAULT_SORT.column);
      if (fallback !== 0) {
        return DEFAULT_SORT.dir === 'asc' ? fallback : -fallback;
      }
    }

    return left.id.localeCompare(right.id);
  });
}

function compareSortValues(left: LoadRecord, right: LoadRecord, column: SortColumn): number {
  if (column === 'specs') {
    return compareNumbers(hasSpecs(left) ? 1 : 0, hasSpecs(right) ? 1 : 0);
  }

  if (column === 'am') {
    return compareStrings(left.account_manager_name ?? '', right.account_manager_name ?? '');
  }

  if (column === 'customer') {
    return compareStrings(left.customer_name ?? '', right.customer_name ?? '');
  }

  if (column === 'ref') {
    const leftValue = `${left.load_ref_number ?? ''}|${left.mcleod_order_id ?? ''}`;
    const rightValue = `${right.load_ref_number ?? ''}|${right.mcleod_order_id ?? ''}`;
    return compareStrings(leftValue, rightValue);
  }

  if (column === 'route') {
    const leftValue = `${left.pu_city ?? ''}|${left.pu_state ?? ''}|${left.del_city ?? ''}|${left.del_state ?? ''}`;
    const rightValue = `${right.pu_city ?? ''}|${right.pu_state ?? ''}|${right.del_city ?? ''}|${right.del_state ?? ''}`;
    return compareStrings(leftValue, rightValue);
  }

  if (column === 'dates') {
    const leftPu = toDateValue(left.pu_date) ?? -Infinity;
    const rightPu = toDateValue(right.pu_date) ?? -Infinity;
    const puCmp = compareNumbers(leftPu, rightPu);
    if (puCmp !== 0) {
      return puCmp;
    }
    const leftDel = toDateValue(left.del_date) ?? -Infinity;
    const rightDel = toDateValue(right.del_date) ?? -Infinity;
    return compareNumbers(leftDel, rightDel);
  }

  if (column === 'rate_rpm') {
    const rateCmp = compareNumbers(Number(left.rate), Number(right.rate));
    if (rateCmp !== 0) {
      return rateCmp;
    }
    return compareNumbers(Number(left.rpm), Number(right.rpm));
  }

  if (column === 'disp_info') {
    const leftValue = `${left.dispatcher_name ?? ''}|${left.driver_name ?? ''}|${left.truck_number ?? ''}`;
    const rightValue = `${right.dispatcher_name ?? ''}|${right.driver_name ?? ''}|${right.truck_number ?? ''}`;
    return compareStrings(leftValue, rightValue);
  }

  return statusSortCompare(left.status, right.status);
}

function compareNumbers(left: number, right: number): number {
  const safeLeft = Number.isNaN(left) ? 0 : left;
  const safeRight = Number.isNaN(right) ? 0 : right;
  if (safeLeft < safeRight) return -1;
  if (safeLeft > safeRight) return 1;
  return 0;
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: 'base' });
}

function statusSortCompare(left: LoadStatus, right: LoadStatus): number {
  const leftRank = statusRank(left);
  const rightRank = statusRank(right);
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }
  return compareStrings(left, right);
}

function statusRank(status: LoadStatus): number {
  const index = STATUS_GROUP_ORDER.indexOf(status);
  if (index >= 0) {
    return index;
  }
  const fallback = LOAD_STATUSES.indexOf(status);
  return STATUS_GROUP_ORDER.length + (fallback >= 0 ? fallback : LOAD_STATUSES.length);
}

function statusLabel(status: LoadStatus): string {
  return status.replace(/_/g, ' ');
}

function customerType(load: LoadRecord): string {
  if (!load.customer_id) {
    return '—';
  }
  return customerTypeById.value.get(load.customer_id) ?? '—';
}

function hasSpecs(load: LoadRecord): boolean {
  return Boolean(load.notes?.trim() || load.other_notes?.trim());
}

function specsTextFor(load: LoadRecord): string {
  return [load.notes?.trim(), load.other_notes?.trim()].filter(Boolean).join('\n\n');
}

function openSpecs(load: LoadRecord): void {
  selectedLoadId.value = load.id;
  selectedSpecs.value = specsTextFor(load);
}

function closeSpecs(): void {
  selectedLoadId.value = '';
  selectedSpecs.value = '';
}

async function saveSpecs(notes: string): Promise<void> {
  if (!selectedLoadId.value) {
    return;
  }

  try {
    await updateLoad(selectedLoadId.value, {
      notes: notes.trim() || null,
    });
    await queryClient.invalidateQueries({ queryKey: ['initial-data'] });
    uiStore.showToast('Specs updated', 'success');
    closeSpecs();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update specs';
    uiStore.showToast(message, 'error');
  }
}

function openEditModal(load: LoadRecord): void {
  editingLoad.value = load;
  editState.customerId = load.customer_id ?? '';
  editState.accountManagerId = load.account_manager_id ?? '';
  editState.loadRefNumber = load.load_ref_number ?? '';
  editState.mcleodOrderId = load.mcleod_order_id ?? '';
  editState.notes = load.notes ?? '';
  editState.puCity = load.pu_city ?? '';
  editState.puState = load.pu_state ?? '';
  editState.puZip = load.pu_zip ?? '';
  editState.puDate = load.pu_date ?? '';
  editState.puAppt = Boolean(load.pu_appt);
  editState.puApptTime = load.pu_appt_time ?? '';
  editState.delCity = load.del_city ?? '';
  editState.delState = load.del_state ?? '';
  editState.delZip = load.del_zip ?? '';
  editState.delDate = load.del_date ?? '';
  editState.delAppt = Boolean(load.del_appt);
  editState.delApptTime = load.del_appt_time ?? '';
  editState.rate = Number(load.rate);
  editState.miles = Number(load.miles);
  editState.assignedDispatcherId = load.assigned_dispatcher_id ?? '';
  editState.driverName = load.driver_name ?? '';
  editState.truckNumber = load.truck_number ?? '';
  editState.status = load.status;
  showEditModal.value = true;
}

function closeEditModal(): void {
  deletingLoad.value = false;
  showEditModal.value = false;
  editingLoad.value = null;
}

async function deleteCurrentLoad(): Promise<void> {
  if (!editingLoad.value || !canDeleteLoads.value || deletingLoad.value) {
    return;
  }

  const loadRef = editingLoad.value.load_ref_number?.trim() || editingLoad.value.id;
  const confirmed = window.confirm(`Delete load ${loadRef}? This cannot be undone.`);
  if (!confirmed) {
    return;
  }

  try {
    deletingLoad.value = true;
    await deleteLoad(editingLoad.value.id);
    await queryClient.invalidateQueries({ queryKey: ['initial-data'] });
    uiStore.showToast('Load deleted', 'success');
    closeEditModal();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete load';
    uiStore.showToast(message, 'error');
  } finally {
    deletingLoad.value = false;
  }
}

async function saveEdit(): Promise<void> {
  if (!editingLoad.value) {
    return;
  }

  const current = editingLoad.value;
  const payload: UpdateLoadPayload = {};

  const customerId = editState.customerId.trim() || null;
  if (customerId !== (current.customer_id ?? null)) payload.customerId = customerId;

  const accountManagerId = editState.accountManagerId.trim() || null;
  if (accountManagerId !== (current.account_manager_id ?? null)) payload.accountManagerId = accountManagerId;

  const loadRefNumber = editState.loadRefNumber.trim();
  if (loadRefNumber !== (current.load_ref_number ?? '')) payload.loadRefNumber = loadRefNumber;

  const mcleodOrderId = editState.mcleodOrderId.trim() || null;
  if (mcleodOrderId !== (current.mcleod_order_id ?? null)) payload.mcleodOrderId = mcleodOrderId;

  const notes = editState.notes.trim() || null;
  if (notes !== (current.notes ?? null)) payload.notes = notes;

  const puCity = editState.puCity.trim();
  if (puCity !== (current.pu_city ?? '')) payload.puCity = puCity;

  const puState = editState.puState.trim().toUpperCase();
  if (puState !== (current.pu_state ?? '')) payload.puState = puState;

  const puZip = editState.puZip.trim() || null;
  if (puZip !== (current.pu_zip ?? null)) payload.puZip = puZip;

  const puDate = editState.puDate.trim() || null;
  if (puDate !== (current.pu_date ?? null)) payload.puDate = puDate;

  if (editState.puAppt !== current.pu_appt) payload.puAppt = editState.puAppt;

  const puApptTime = editState.puAppt ? editState.puApptTime.trim() || null : null;
  if (puApptTime !== (current.pu_appt_time ?? null)) payload.puApptTime = puApptTime;

  const delCity = editState.delCity.trim();
  if (delCity !== (current.del_city ?? '')) payload.delCity = delCity;

  const delState = editState.delState.trim().toUpperCase();
  if (delState !== (current.del_state ?? '')) payload.delState = delState;

  const delZip = editState.delZip.trim() || null;
  if (delZip !== (current.del_zip ?? null)) payload.delZip = delZip;

  const delDate = editState.delDate.trim() || null;
  if (delDate !== (current.del_date ?? null)) payload.delDate = delDate;

  if (editState.delAppt !== current.del_appt) payload.delAppt = editState.delAppt;

  const delApptTime = editState.delAppt ? editState.delApptTime.trim() || null : null;
  if (delApptTime !== (current.del_appt_time ?? null)) payload.delApptTime = delApptTime;

  if (Number(editState.rate) !== Number(current.rate)) payload.rate = Number(editState.rate);
  if (Number(editState.miles) !== Number(current.miles)) payload.miles = Number(editState.miles);

  const assignedDispatcherId = editState.assignedDispatcherId.trim() || null;
  if (assignedDispatcherId !== (current.assigned_dispatcher_id ?? null)) payload.assignedDispatcherId = assignedDispatcherId;

  const driverName = editState.driverName.trim() || null;
  if (driverName !== (current.driver_name ?? null)) payload.driverName = driverName;

  const truckNumber = editState.truckNumber.trim() || null;
  if (truckNumber !== (current.truck_number ?? null)) payload.truckNumber = truckNumber;

  if (editState.status !== current.status) payload.status = editState.status;

  const nextStatus = payload.status ?? current.status;
  const nextMiles = payload.miles ?? Number(current.miles);
  if (nextMiles < 0) {
    uiStore.showToast('Miles cannot be negative.', 'error');
    return;
  }
  if (nextMiles === 0 && nextStatus !== 'TONU') {
    uiStore.showToast('Miles can be 0 only when status is TONU.', 'error');
    return;
  }

  if (Object.keys(payload).length === 0) {
    uiStore.showToast('No changes to save', 'info');
    return;
  }

  try {
    await updateLoad(current.id, payload);
    await queryClient.invalidateQueries({ queryKey: ['initial-data'] });
    uiStore.showToast('Load updated', 'success');
    closeEditModal();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update load';
    uiStore.showToast(message, 'error');
  }
}

function formatCurrency(value: string | number): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '0.00';
  return parsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMiles(value: string | number): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '0';
  return parsed.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function statusBadge(status: LoadStatus): string {
  if (status === 'AVAILABLE') return 'rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
  if (status === 'PENDING_APPROVAL') return 'rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  if (status === 'QUOTE_SUBMITTED') return 'rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  if (status === 'COVERED') return 'rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800 dark:bg-green-900/30 dark:text-green-300';
  if (status === 'LOADED') return 'rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
  if (status === 'DELAYED') return 'rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800 dark:bg-red-900/30 dark:text-red-300';
  if (status === 'DELIVERED') return 'rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-800 dark:bg-teal-900/30 dark:text-teal-300';
  if (status === 'BROKERAGE') return 'rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
  if (status === 'CANCELED') return 'rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
  if (status === 'TONU') return 'rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-bold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300';
  return 'rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
}

function toDateValue(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const directIso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (directIso) {
    return Date.UTC(Number(directIso[1]), Number(directIso[2]) - 1, Number(directIso[3]));
  }

  const isoPrefix = /^(\d{4})-(\d{2})-(\d{2})T/.exec(trimmed);
  if (isoPrefix) {
    return Date.UTC(Number(isoPrefix[1]), Number(isoPrefix[2]) - 1, Number(isoPrefix[3]));
  }

  const slashDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (slashDate) {
    return Date.UTC(Number(slashDate[3]), Number(slashDate[1]) - 1, Number(slashDate[2]));
  }

  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDateBoundary(value: string, boundary: 'start' | 'end'): number | null {
  const parsed = toDateValue(value);
  if (parsed === null) {
    return null;
  }

  if (boundary === 'start') {
    return parsed;
  }

  return parsed + 86_399_999;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
</script>
