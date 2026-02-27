<template>
  <section class="space-y-4">
    <header class="flex items-center justify-between">
      <h3 class="text-sm font-black uppercase tracking-widest text-zinc-700">Settlement</h3>
      <button
        type="button"
        class="rounded bg-brand-red px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-brand-red-strong"
        @click="emit('refresh')"
      >
        Refresh Data
      </button>
    </header>

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
      <article class="rounded-xl border border-zinc-200 bg-white/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/25">
        <h4 class="text-xs font-black uppercase tracking-widest text-zinc-700">Generate Settlement</h4>

        <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label class="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            User
            <select
              v-model="selectedUserId"
              class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="">Select user</option>
              <option v-for="user in generationUsers" :key="user.id" :value="user.id">
                {{ user.name }} ({{ roleLabel(user.role) }})
              </option>
            </select>
          </label>

          <label class="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Month
            <select
              v-model.number="selectedMonth"
              class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option v-for="month in months" :key="month.value" :value="month.value">{{ month.label }}</option>
            </select>
          </label>

          <label class="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Year
            <input
              v-model.number="selectedYear"
              type="number"
              min="2000"
              max="2100"
              class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>

          <label class="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Calculation Method
            <select
              v-model="calculationMethod"
              class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="PU">PU Date</option>
              <option value="DELIVERY">Delivery Date</option>
            </select>
          </label>
        </div>

        <div class="mt-4 flex items-center gap-2">
          <button
            type="button"
            class="rounded bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
            :disabled="isGenerating || !selectedUserId"
            @click="onGenerate(false)"
          >
            {{ isGenerating ? 'Generating...' : 'Generate Settlement' }}
          </button>
          <p class="text-xs text-zinc-600 dark:text-zinc-400">
            Duplicate generation is blocked unless override is confirmed.
          </p>
        </div>
      </article>

      <article class="rounded-xl border border-zinc-200 bg-white/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/25">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-black uppercase tracking-widest text-zinc-700">Active Tier Config</h4>
          <button
            type="button"
            class="rounded bg-zinc-900 px-2 py-1 text-[10px] font-bold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
            @click="openTierEditModal"
          >
            Edit
          </button>
        </div>

        <div v-if="config" class="mt-3 grid grid-cols-1 gap-3 text-xs text-zinc-700 md:grid-cols-2 dark:text-zinc-300">
          <div class="rounded border border-zinc-200 p-2 dark:border-zinc-800">
            <p>Version: <span class="font-bold">{{ config.tierConfig.version }}</span></p>
            <p class="mt-1">
              Tier 1: 0 - {{ config.tierConfig.tier1MaxLoad }}
              <span class="mx-1 text-zinc-400" aria-hidden="true">&bull;</span>
              {{ money(config.tierConfig.tier1Rate) }}
            </p>
            <p>
              Tier 2: {{ config.tierConfig.tier1MaxLoad + 1 }} - {{ config.tierConfig.tier2MaxLoad }}
              <span class="mx-1 text-zinc-400" aria-hidden="true">&bull;</span>
              {{ money(config.tierConfig.tier2Rate) }}
            </p>
            <p>
              Tier 3: {{ config.tierConfig.tier2MaxLoad + 1 }}+
              <span class="mx-1 text-zinc-400" aria-hidden="true">&bull;</span>
              {{ money(config.tierConfig.tier3Rate) }}
            </p>
          </div>

          <div class="rounded border border-zinc-200 p-2 dark:border-zinc-800">
            <p class="font-semibold">Broker Load Pay: {{ money(config.tierConfig.brokerLoadPay) }}</p>
            <p class="mt-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Direct Exception Customers</p>
            <div class="mt-1 max-h-24 overflow-y-auto text-[11px]">
              <p
                v-for="customer in selectedExceptionCustomers"
                :key="`active-ex-${customer.id}`"
                class="truncate"
              >
                {{ customer.name }}
              </p>
              <p v-if="selectedExceptionCustomers.length === 0" class="text-zinc-500">No exception customers selected.</p>
            </div>
          </div>
        </div>
        <p v-else class="mt-3 text-xs text-zinc-600 dark:text-zinc-400">Loading configuration...</p>
      </article>
    </div>

    <article class="rounded-xl border border-zinc-200 bg-white/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/25">
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-black uppercase tracking-widest text-zinc-700">Admin Configuration</h4>
        <button
          type="button"
          class="rounded border border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          @click="adminConfigExpanded = !adminConfigExpanded"
        >
          {{ adminConfigExpanded ? 'Collapse' : 'Expand' }}
        </button>
      </div>

      <div v-if="adminConfigExpanded" class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section class="rounded border border-zinc-200 p-3 dark:border-zinc-800">
          <h5 class="text-[11px] font-black uppercase tracking-widest text-zinc-700">Direct Customer Exceptions</h5>
          <p class="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">Direct customers checked here are paid at {{ money(activeBrokerPay) }} per load.</p>

          <div class="mt-2 rounded border border-zinc-200 dark:border-zinc-800">
            <div class="sticky top-0 z-10 space-y-2 border-b border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
              <input
                v-model="exceptionSearch"
                type="text"
                placeholder="Search direct customers..."
                class="w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
              />

              <div class="flex flex-wrap gap-1">
                <span
                  v-for="customer in selectedExceptionCustomers"
                  :key="`selected-pin-${customer.id}`"
                  class="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  {{ customer.name }}
                  <button type="button" class="text-[10px]" @click="toggleExceptionCustomer(customer.id, false)">x</button>
                </span>
                <span v-if="selectedExceptionCustomers.length === 0" class="text-[10px] text-zinc-500">No selected customers.</span>
              </div>
            </div>

            <div class="max-h-64 space-y-1 overflow-y-auto p-2">
              <label
                v-for="customer in filteredDirectCustomers"
                :key="customer.id"
                class="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300"
              >
                <input
                  :checked="selectedExceptionCustomerIds.includes(customer.id)"
                  type="checkbox"
                  @change="onExceptionCheckboxChange(customer.id, $event)"
                />
                <span>{{ customer.name }}</span>
              </label>
              <p v-if="filteredDirectCustomers.length === 0" class="text-xs text-zinc-500">No direct customers match your search.</p>
            </div>
          </div>

          <button
            type="button"
            class="mt-2 w-full rounded bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            :disabled="isSavingExceptions"
            @click="saveExceptions"
          >
            {{ isSavingExceptions ? 'Saving...' : 'Save Exception List' }}
          </button>
        </section>

        <section class="rounded border border-zinc-200 p-3 dark:border-zinc-800">
          <div class="flex items-center justify-between">
            <h5 class="text-[11px] font-black uppercase tracking-widest text-zinc-700">Default Flat Pay per User</h5>
            <button
              type="button"
              class="rounded border border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              @click="showExcludedPayrollUsers = !showExcludedPayrollUsers"
            >
              {{ showExcludedPayrollUsers ? 'Hide Excluded' : 'Show Excluded' }}
            </button>
          </div>

          <div class="mt-2 max-h-72 space-y-2 overflow-y-auto">
            <div
              v-for="user in payrollUsersForFlatPay"
              :key="`flat-pay-${user.id}`"
              class="rounded border border-zinc-200 p-2 dark:border-zinc-800"
            >
              <div class="grid grid-cols-[minmax(0,1fr)_130px_auto] items-center gap-2">
                <div>
                  <p class="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-200">{{ user.name }}</p>
                  <p class="text-[10px] text-zinc-500">{{ roleLabel(user.role) }}</p>
                </div>
                <input
                  v-model="defaultFlatPayInputs[user.id]"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Default pay"
                  class="w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                />
                <div class="flex items-center gap-2">
                  <label class="flex items-center gap-1 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                    <input v-model="excludeFromPayrollInputs[user.id]" type="checkbox" />
                    Exclude from payroll
                  </label>
                  <button
                    type="button"
                    class="rounded bg-zinc-900 px-2 py-1 text-[10px] font-bold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
                    :disabled="Boolean(savingFlatPayByUser[user.id])"
                    @click="saveFlatPay(user.id)"
                  >
                    {{ savingFlatPayByUser[user.id] ? '...' : 'Save' }}
                  </button>
                </div>
              </div>
            </div>

            <p v-if="payrollUsersForFlatPay.length === 0" class="text-xs text-zinc-500">
              No users visible with current filters.
            </p>
          </div>
        </section>

      </div>
    </article>

    <article class="rounded-xl border border-zinc-200 bg-white/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/25">
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-black uppercase tracking-widest text-zinc-700">Settlement History</h4>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded border border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            :disabled="isLoadingHistory"
            @click="loadSettlementHistory"
          >
            {{ isLoadingHistory ? 'Loading...' : 'Refresh' }}
          </button>
          <button
            type="button"
            class="rounded border border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            @click="historyExpanded = !historyExpanded"
          >
            {{ historyExpanded ? 'Collapse' : 'Expand' }}
          </button>
        </div>
      </div>

      <div v-if="historyExpanded" class="mt-2">
        <div class="overflow-hidden rounded border border-zinc-200 dark:border-zinc-800">
          <div class="overflow-x-auto">
            <table class="min-w-full text-left text-xs">
              <thead class="bg-zinc-100/70 text-[10px] uppercase tracking-widest text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
                <tr>
                  <th class="px-2 py-1">Generated</th>
                  <th class="px-2 py-1">Generated by</th>
                  <th class="px-2 py-1">User</th>
                  <th class="px-2 py-1">Month/Year</th>
                  <th class="px-2 py-1">Method</th>
                  <th class="px-2 py-1">Status</th>
                  <th class="px-2 py-1 text-right">Total</th>
                  <th class="px-2 py-1">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
                <tr v-for="record in settlementHistory" :key="`history-${record.id}`">
                  <td class="px-2 py-1">{{ formatDateTimeDisplayLocal(record.summary.createdAt) || '-' }}</td>
                  <td class="px-2 py-1">{{ record.summary.generatedByName || '-' }}</td>
                  <td class="px-2 py-1 font-semibold">{{ record.summary.userName }}</td>
                  <td class="px-2 py-1">{{ monthYearText(record.summary.month, record.summary.year) }}</td>
                  <td class="px-2 py-1">{{ record.summary.calculationMethod }}</td>
                  <td class="px-2 py-1">{{ record.summary.status }}</td>
                  <td class="px-2 py-1 text-right">{{ money(record.summary.totalSettlementAmount) }}</td>
                  <td class="px-2 py-1">
                    <div class="flex items-center gap-1">
                      <button
                        type="button"
                        class="rounded bg-zinc-900 px-2 py-1 text-[10px] font-bold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
                        @click="openHistorySettlement(record.id)"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        class="rounded bg-red-700 px-2 py-1 text-[10px] font-bold text-white hover:bg-red-800"
                        @click="requestDeleteSettlement(record.id)"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="settlementHistory.length === 0">
                  <td colspan="8" class="px-2 py-3 text-center text-zinc-500">No settlements generated yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </article>

    <div v-if="showPreview && settlementDetail" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="closePreview">
      <div class="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white p-4 shadow-xl dark:bg-zinc-900">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-bold">Settlement Preview</h4>
          <button type="button" class="text-sm text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100" @click="closePreview">X</button>
        </div>

        <div class="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-2 lg:grid-cols-4">
          <div class="rounded border border-zinc-200 p-2 dark:border-zinc-800">
            <p class="text-zinc-500">User</p>
            <p class="font-bold">{{ settlementDetail.summary.userName }}</p>
          </div>
          <div class="rounded border border-zinc-200 p-2 dark:border-zinc-800">
            <p class="text-zinc-500">Month / Year</p>
            <p class="font-bold">{{ monthText(settlementDetail.summary.month) }}/{{ settlementDetail.summary.year }}</p>
          </div>
          <div class="rounded border border-zinc-200 p-2 dark:border-zinc-800">
            <p class="text-zinc-500">Method</p>
            <p class="font-bold">{{ settlementDetail.summary.calculationMethod }}</p>
          </div>
          <div class="rounded border border-zinc-200 p-2 dark:border-zinc-800">
            <p class="text-zinc-500">Total Settlement</p>
            <p class="font-bold">{{ money(settlementDetail.summary.totalSettlementAmount) }}</p>
          </div>
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded border border-zinc-300 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            @click="showDetailedPreview = !showDetailedPreview"
          >
            {{ showDetailedPreview ? 'Show Summary' : 'Show Detailed Settlement' }}
          </button>
          <button
            type="button"
            class="rounded bg-brand-red px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-red-strong"
            @click="downloadPdf"
          >
            Download as PDF
          </button>
        </div>

        <div v-if="!showDetailedPreview" class="mt-4 overflow-hidden rounded border border-zinc-200 dark:border-zinc-800">
          <table class="min-w-full text-left text-xs">
            <thead class="bg-zinc-100/70 text-[10px] uppercase tracking-widest text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
              <tr>
                <th class="px-3 py-2">Category</th>
                <th class="px-3 py-2 text-right">Volume</th>
                <th class="px-3 py-2 text-right">Rate / Tier</th>
                <th class="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
              <tr>
                <td class="px-3 py-2 font-semibold">Default Flat Pay</td>
                <td class="px-3 py-2 text-right">-</td>
                <td class="px-3 py-2 text-right">-</td>
                <td class="px-3 py-2 text-right">{{ money(settlementDetail.summary.defaultFlatPay) }}</td>
              </tr>
              <tr>
                <td class="px-3 py-2 pl-8 font-semibold">Broker Loads</td>
                <td class="px-3 py-2 text-right">{{ settlementDetail.summary.brokerLoadCount }}</td>
                <td class="px-3 py-2 text-right">{{ money(brokerUnitPay(settlementDetail)) }}</td>
                <td class="px-3 py-2 text-right">{{ money(entryTotal(settlementDetail.brokerLoads)) }}</td>
              </tr>
              <tr>
                <td class="px-3 py-2 pl-8 font-semibold" colspan="3">Direct Exception Loads</td>
                <td class="px-3 py-2 text-right">{{ money(entryTotal(settlementDetail.directExceptionLoads)) }}</td>
              </tr>
              <tr
                v-for="item in directExceptionCustomerBreakdown"
                :key="`direct-ex-customer-${item.customerName}`"
                class="bg-zinc-50/50 dark:bg-zinc-900/20"
              >
                <td class="px-3 py-1 pl-12 text-[11px] text-zinc-600 dark:text-zinc-400">{{ item.customerName }}</td>
                <td class="px-3 py-1 text-right text-[11px] text-zinc-600 dark:text-zinc-400">{{ item.loadCount }}</td>
                <td class="px-3 py-1 text-right text-[11px] text-zinc-600 dark:text-zinc-400">{{ money(brokerUnitPay(settlementDetail)) }}</td>
                <td class="px-3 py-1 text-right text-[11px] text-zinc-600 dark:text-zinc-400">{{ money(item.totalAmount) }}</td>
              </tr>
              <tr>
                <td class="px-3 py-2 pl-8 font-semibold">Standard Direct Loads</td>
                <td class="px-3 py-2 text-right">{{ settlementDetail.summary.directStandardLoadCount }}</td>
                <td class="px-3 py-2 text-right">
                  <div>
                    Tier {{ settlementDetail.summary.tierApplied }}
                    <span class="mx-1 text-zinc-400" aria-hidden="true">&bull;</span>
                    {{ money(settlementDetail.summary.tierRate) }}
                  </div>
                  <div class="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Basis (All Payable Loads):
                    {{ settlementDetail.summary.tierBasisLoadCount === null ? 'Legacy' : settlementDetail.summary.tierBasisLoadCount }}
                  </div>
                </td>
                <td class="px-3 py-2 text-right">{{ money(entryTotal(settlementDetail.directStandardLoads)) }}</td>
              </tr>
              <tr v-if="settlementDetail.excludedTonuLoads.length > 0">
                <td class="px-3 py-2 pl-8 font-semibold">Excluded TONU (&lt; $200)</td>
                <td class="px-3 py-2 text-right">{{ settlementDetail.excludedTonuLoads.length }}</td>
                <td class="px-3 py-2 text-right">Not Paid</td>
                <td class="px-3 py-2 text-right">{{ money(0) }}</td>
              </tr>
              <template v-if="settlementDetail.excludedTonuLoads.length > 0">
                <tr
                  v-for="load in settlementDetail.excludedTonuLoads"
                  :key="`excluded-sub-${load.id}`"
                  class="bg-zinc-50/50 dark:bg-zinc-900/20"
                >
                  <td class="px-3 py-1 pl-12 text-[11px] text-zinc-600 dark:text-zinc-400" colspan="4">
                    McLeod Order #{{ load.mcleodOrderId || 'N/A' }} | Revenue {{ money(load.revenue) }}
                  </td>
                </tr>
              </template>
              <tr v-if="settlementDetail.crossMonthLoads.length > 0">
                <td class="px-3 py-2 pl-8 font-semibold">Cross-Month (Already Paid)</td>
                <td class="px-3 py-2 text-right">{{ settlementDetail.crossMonthLoads.length }}</td>
                <td class="px-3 py-2 text-right">Already Paid</td>
                <td class="px-3 py-2 text-right">{{ money(0) }}</td>
              </tr>
              <template v-if="settlementDetail.crossMonthLoads.length > 0">
                <tr
                  v-for="load in settlementDetail.crossMonthLoads"
                  :key="`cross-sub-${load.id}`"
                  class="bg-zinc-50/50 dark:bg-zinc-900/20"
                >
                  <td class="px-3 py-1 pl-12 text-[11px] text-zinc-600 dark:text-zinc-400" colspan="4">
                    McLeod Order #{{ load.mcleodOrderId || 'N/A' }} | Revenue {{ money(load.revenue) }}
                  </td>
                </tr>
              </template>
              <tr>
                <td class="px-3 py-2 font-semibold" colspan="3">Total Load Compensation</td>
                <td class="px-3 py-2 text-right">{{ money(settlementDetail.summary.totalLoadCompensation) }}</td>
              </tr>
              <tr>
                <td class="px-3 py-2 font-bold" colspan="3">Total Settlement</td>
                <td class="px-3 py-2 text-right font-bold">{{ money(settlementDetail.summary.totalSettlementAmount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="mt-4 space-y-4">
          <section>
            <h5 class="text-xs font-black uppercase tracking-widest text-zinc-700">Broker Loads</h5>
            <SettlementEntryTable :rows="settlementDetail.brokerLoads" />
          </section>
          <section>
            <h5 class="text-xs font-black uppercase tracking-widest text-zinc-700">Direct Exception Loads</h5>
            <SettlementEntryTable :rows="settlementDetail.directExceptionLoads" />
          </section>
          <section>
            <h5 class="text-xs font-black uppercase tracking-widest text-zinc-700">Standard Direct Tier Loads</h5>
            <SettlementEntryTable :rows="settlementDetail.directStandardLoads" />
          </section>
          <section>
            <h5 class="text-xs font-black uppercase tracking-widest text-zinc-700">Excluded TONU Loads (&lt; $200)</h5>
            <SettlementEntryTable :rows="settlementDetail.excludedTonuLoads" />
          </section>
          <section>
            <h5 class="text-xs font-black uppercase tracking-widest text-zinc-700">Delivered This Month - Paid Previously</h5>
            <SettlementEntryTable :rows="settlementDetail.crossMonthLoads" />
          </section>
        </div>
      </div>
    </div>

    <div
      v-if="settlementIdPendingDelete"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="closeDeleteModal"
    >
      <div class="w-full max-w-md rounded-xl bg-white p-4 shadow-xl dark:bg-zinc-900">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-bold">Delete Settlement</h4>
          <button
            type="button"
            class="text-sm text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100"
            :disabled="isDeletingSettlement"
            @click="closeDeleteModal"
          >
            X
          </button>
        </div>
        <p class="mt-3 text-xs text-zinc-700 dark:text-zinc-300">
          This action cannot be undone. Delete
          <span class="font-semibold">{{ deleteModalLabel }}</span>?
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            :disabled="isDeletingSettlement"
            @click="closeDeleteModal"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded bg-red-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-60"
            :disabled="isDeletingSettlement"
            @click="confirmDeleteSettlement"
          >
            {{ isDeletingSettlement ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showTierEditModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showTierEditModal = false">
      <div class="w-full max-w-md rounded-xl bg-white p-4 shadow-xl dark:bg-zinc-900">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-bold">Edit Tier Configuration</h4>
          <button type="button" class="text-sm text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100" @click="showTierEditModal = false">X</button>
        </div>

        <div class="mt-3 space-y-2">
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Broker Load Pay
            <input v-model.number="tierDraft.brokerLoadPay" type="number" min="0" step="0.01" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
          </label>
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Tier 1 Max Load
            <input v-model.number="tierDraft.tier1MaxLoad" type="number" min="0" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
          </label>
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Tier 1 Rate
            <input v-model.number="tierDraft.tier1Rate" type="number" min="0" step="0.01" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
          </label>
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Tier 2 Max Load
            <input v-model.number="tierDraft.tier2MaxLoad" type="number" min="1" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
          </label>
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Tier 2 Rate
            <input v-model.number="tierDraft.tier2Rate" type="number" min="0" step="0.01" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
          </label>
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Tier 3 Rate
            <input v-model.number="tierDraft.tier3Rate" type="number" min="0" step="0.01" class="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
          </label>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            @click="showTierEditModal = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            :disabled="isSavingTier"
            @click="saveTierFromModal"
          >
            {{ isSavingTier ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref, watch } from 'vue';

import {
  deleteSettlement,
  generateSettlement,
  getSettlementDetail,
  getSettlementConfig,
  getSettlementPdfUrl,
  listSettlements,
  updateSettlementDirectExceptions,
  updateSettlementTier,
  updateUserDefaultFlatPay,
} from '@/api/freight';
import { ApiRequestError } from '@/api/http';
import { formatDateDisplay, formatDateTimeDisplayLocal } from '@/utils/dateFormat';
import { useUiStore } from '@/stores/ui';
import type {
  CustomerRecord,
  SessionUser,
  SettlementCalculationMethod,
  SettlementConfig,
  SettlementDetail,
  SettlementLoadEntry,
  SettlementRecord,
  UserRecord,
} from '@/types/models';

const SettlementEntryTable = defineComponent({
  name: 'SettlementEntryTable',
  props: {
    rows: {
      type: Array as () => SettlementLoadEntry[],
      required: true,
    },
  },
  setup(props) {
    const renderCell = (value: string): string => value;

    return () =>
      h('div', { class: 'mt-2 overflow-hidden rounded border border-zinc-200 dark:border-zinc-800' }, [
        h('div', { class: 'overflow-x-auto' }, [
          h('table', { class: 'min-w-full text-left text-xs' }, [
            h('thead', { class: 'bg-zinc-100/70 text-[10px] uppercase tracking-widest text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300' }, [
              h('tr', [
                h('th', { class: 'px-2 py-1' }, 'Load'),
                h('th', { class: 'px-2 py-1' }, 'PU'),
                h('th', { class: 'px-2 py-1' }, 'DEL'),
                h('th', { class: 'px-2 py-1' }, 'Status'),
                h('th', { class: 'px-2 py-1' }, 'Revenue'),
                h('th', { class: 'px-2 py-1' }, 'Compensation'),
                h('th', { class: 'px-2 py-1' }, 'Prev Settlement'),
              ]),
            ]),
            h('tbody', { class: 'divide-y divide-zinc-100 dark:divide-zinc-800' },
              props.rows.length > 0
                ? props.rows.map((row) =>
                    h('tr', { key: row.id }, [
                      h('td', { class: 'px-2 py-1 font-semibold' }, renderCell(row.mcleodOrderId ? `${row.loadRefNumber || '-'} / ${row.mcleodOrderId}` : (row.loadRefNumber || '-'))),
                      h('td', { class: 'px-2 py-1' }, formatDateDisplay(row.puDate) || '-'),
                      h('td', { class: 'px-2 py-1' }, formatDateDisplay(row.delDate) || '-'),
                      h('td', { class: 'px-2 py-1' }, row.status ?? '-'),
                      h('td', { class: 'px-2 py-1' }, `$${row.revenue.toFixed(2)}`),
                      h('td', { class: 'px-2 py-1' }, `$${row.compensationAmount.toFixed(2)}`),
                      h('td', { class: 'px-2 py-1' },
                        row.previousSettlementMonth && row.previousSettlementYear
                          ? `${String(row.previousSettlementMonth).padStart(2, '0')}/${row.previousSettlementYear}`
                          : '-',
                      ),
                    ]),
                  )
                : [
                    h('tr', { key: 'empty' }, [
                      h('td', { class: 'px-2 py-3 text-center text-zinc-500', colspan: 7 }, 'No rows'),
                    ]),
                  ],
            ),
          ]),
        ]),
      ]);
  },
});

const props = defineProps<{
  users: UserRecord[];
  customers: CustomerRecord[];
  currentUser: SessionUser | null;
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const uiStore = useUiStore();

const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const now = new Date();
const selectedUserId = ref('');
const selectedMonth = ref(now.getMonth() + 1);
const selectedYear = ref(now.getFullYear());
const calculationMethod = ref<SettlementCalculationMethod>('PU');

const config = ref<SettlementConfig | null>(null);
const isGenerating = ref(false);
const isSavingTier = ref(false);
const isSavingExceptions = ref(false);
const savingFlatPayByUser = reactive<Record<string, boolean>>({});

const selectedExceptionCustomerIds = ref<string[]>([]);
const exceptionSearch = ref('');

const defaultFlatPayInputs = reactive<Record<string, string | number>>({});
const excludeFromPayrollInputs = reactive<Record<string, boolean>>({});
const showExcludedPayrollUsers = ref(false);

const showPreview = ref(false);
const settlementDetail = ref<SettlementDetail | null>(null);
const showDetailedPreview = ref(false);

const adminConfigExpanded = ref(false);
const historyExpanded = ref(false);
const settlementHistory = ref<SettlementRecord[]>([]);
const isLoadingHistory = ref(false);
const settlementIdPendingDelete = ref<string | null>(null);
const isDeletingSettlement = ref(false);

const showTierEditModal = ref(false);
const tierDraft = reactive({
  brokerLoadPay: 5,
  tier1MaxLoad: 200,
  tier1Rate: 10,
  tier2MaxLoad: 300,
  tier2Rate: 10.5,
  tier3Rate: 11,
});

const activeBrokerPay = computed(() => config.value?.tierConfig.brokerLoadPay ?? tierDraft.brokerLoadPay);

const payrollUsers = computed(() =>
  props.users
    .filter((user) => user.role === 'ACCOUNT_MANAGER' || user.role === 'ADMIN' || user.role === 'MANAGER')
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })),
);

const generationUsers = computed(() => payrollUsers.value.filter((user) => !user.exclude_from_payroll));

const payrollUsersForFlatPay = computed(() =>
  payrollUsers.value.filter((user) => showExcludedPayrollUsers.value || !user.exclude_from_payroll),
);

const directCustomers = computed(() =>
  props.customers
    .filter((customer) => customer.type === 'Direct Customer')
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })),
);

const selectedExceptionCustomers = computed(() => {
  const selected = new Set(selectedExceptionCustomerIds.value);
  return directCustomers.value.filter((customer) => selected.has(customer.id));
});

const directExceptionCustomerBreakdown = computed(() => {
  const detail = settlementDetail.value;
  if (!detail) {
    return [] as Array<{ customerName: string; loadCount: number; totalAmount: number }>;
  }

  const grouped = new Map<string, { customerName: string; loadCount: number; totalAmount: number }>();
  for (const load of detail.directExceptionLoads) {
    const customerName = load.customerName?.trim() || 'Unknown Customer';
    const existing = grouped.get(customerName);
    if (existing) {
      existing.loadCount += 1;
      existing.totalAmount += load.compensationAmount;
      continue;
    }

    grouped.set(customerName, {
      customerName,
      loadCount: 1,
      totalAmount: load.compensationAmount,
    });
  }

  return [...grouped.values()].sort((left, right) =>
    left.customerName.localeCompare(right.customerName, undefined, { sensitivity: 'base' }),
  );
});

const deleteModalLabel = computed(() => {
  if (!settlementIdPendingDelete.value) {
    return 'this settlement';
  }

  const record = settlementHistory.value.find((item) => item.id === settlementIdPendingDelete.value);
  if (!record) {
    return 'this settlement';
  }

  return `${record.summary.userName} (${monthYearText(record.summary.month, record.summary.year)} / ${record.summary.calculationMethod})`;
});

const filteredDirectCustomers = computed(() => {
  const selected = new Set(selectedExceptionCustomerIds.value);
  const term = exceptionSearch.value.trim().toLowerCase();

  return directCustomers.value
    .filter((customer) => !term || customer.name.toLowerCase().includes(term))
    .sort((left, right) => {
      const leftSelected = selected.has(left.id) ? 1 : 0;
      const rightSelected = selected.has(right.id) ? 1 : 0;
      if (leftSelected !== rightSelected) {
        return rightSelected - leftSelected;
      }
      return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
    });
});

watch(
  () => props.users,
  (users) => {
    for (const user of users) {
      defaultFlatPayInputs[user.id] = user.default_flat_pay === null ? '' : Number(user.default_flat_pay).toFixed(2);
      excludeFromPayrollInputs[user.id] = Boolean(user.exclude_from_payroll);
    }

    const selectedStillVisible = generationUsers.value.some((user) => user.id === selectedUserId.value);
    if (!selectedStillVisible) {
      selectedUserId.value = generationUsers.value[0]?.id ?? '';
    }
  },
  { immediate: true, deep: true },
);

async function loadConfig(): Promise<void> {
  try {
    const next = await getSettlementConfig();
    config.value = next;
    selectedExceptionCustomerIds.value = [...next.directExceptionCustomerIds];

    tierDraft.tier1MaxLoad = next.tierConfig.tier1MaxLoad;
    tierDraft.brokerLoadPay = next.tierConfig.brokerLoadPay;
    tierDraft.tier1Rate = next.tierConfig.tier1Rate;
    tierDraft.tier2MaxLoad = next.tierConfig.tier2MaxLoad;
    tierDraft.tier2Rate = next.tierConfig.tier2Rate;
    tierDraft.tier3Rate = next.tierConfig.tier3Rate;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load settlement configuration.';
    uiStore.showToast(message, 'error');
  }
}

async function loadSettlementHistory(): Promise<void> {
  isLoadingHistory.value = true;
  try {
    settlementHistory.value = await listSettlements(100);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load settlement history.';
    uiStore.showToast(message, 'error');
  } finally {
    isLoadingHistory.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadConfig(), loadSettlementHistory()]);
});

function openSettlementPreview(detail: SettlementDetail): void {
  settlementDetail.value = detail;
  showDetailedPreview.value = false;
  showPreview.value = true;
}

async function onGenerate(override: boolean): Promise<void> {
  if (!selectedUserId.value) {
    uiStore.showToast('Please select a user.', 'error');
    return;
  }

  isGenerating.value = true;
  try {
    const generated = await generateSettlement({
      userId: selectedUserId.value,
      month: selectedMonth.value,
      year: selectedYear.value,
      calculationMethod: calculationMethod.value,
      override,
    });

    openSettlementPreview(generated);
    await loadSettlementHistory();
    uiStore.showToast('Settlement generated successfully.', 'success');
    emit('refresh');
  } catch (error) {
    if (error instanceof ApiRequestError && error.code === 'SETTLEMENT_EXISTS' && !override) {
      const confirmed = window.confirm('A settlement already exists for this month/method. Override it?');
      if (confirmed) {
        await onGenerate(true);
      }
      return;
    }

    const message = error instanceof Error ? error.message : 'Failed to generate settlement.';
    uiStore.showToast(message, 'error');
  } finally {
    isGenerating.value = false;
  }
}

async function openHistorySettlement(settlementId: string): Promise<void> {
  try {
    const detail = await getSettlementDetail(settlementId);
    openSettlementPreview(detail);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load settlement.';
    uiStore.showToast(message, 'error');
  }
}

function requestDeleteSettlement(settlementId: string): void {
  if (isDeletingSettlement.value) {
    return;
  }
  settlementIdPendingDelete.value = settlementId;
}

function closeDeleteModal(): void {
  if (isDeletingSettlement.value) {
    return;
  }
  settlementIdPendingDelete.value = null;
}

async function confirmDeleteSettlement(): Promise<void> {
  const settlementId = settlementIdPendingDelete.value;
  if (!settlementId) {
    return;
  }

  isDeletingSettlement.value = true;
  try {
    await deleteSettlement(settlementId);
    if (settlementDetail.value?.id === settlementId) {
      settlementDetail.value = null;
      showPreview.value = false;
      showDetailedPreview.value = false;
    }
    settlementIdPendingDelete.value = null;
    await loadSettlementHistory();
    uiStore.showToast('Settlement deleted.', 'success');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete settlement.';
    uiStore.showToast(message, 'error');
  } finally {
    isDeletingSettlement.value = false;
  }
}

function openTierEditModal(): void {
  if (config.value) {
    tierDraft.brokerLoadPay = config.value.tierConfig.brokerLoadPay;
    tierDraft.tier1MaxLoad = config.value.tierConfig.tier1MaxLoad;
    tierDraft.tier1Rate = config.value.tierConfig.tier1Rate;
    tierDraft.tier2MaxLoad = config.value.tierConfig.tier2MaxLoad;
    tierDraft.tier2Rate = config.value.tierConfig.tier2Rate;
    tierDraft.tier3Rate = config.value.tierConfig.tier3Rate;
  }
  showTierEditModal.value = true;
}

async function saveTierFromModal(): Promise<void> {
  isSavingTier.value = true;
  try {
    const updated = await updateSettlementTier({
      brokerLoadPay: tierDraft.brokerLoadPay,
      tier1MaxLoad: tierDraft.tier1MaxLoad,
      tier1Rate: tierDraft.tier1Rate,
      tier2MaxLoad: tierDraft.tier2MaxLoad,
      tier2Rate: tierDraft.tier2Rate,
      tier3Rate: tierDraft.tier3Rate,
    });

    if (config.value) {
      config.value = {
        tierConfig: updated,
        directExceptionCustomerIds: [...selectedExceptionCustomerIds.value],
      };
    }

    uiStore.showToast('Tier configuration saved.', 'success');
    showTierEditModal.value = false;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save tier configuration.';
    uiStore.showToast(message, 'error');
  } finally {
    isSavingTier.value = false;
  }
}

function toggleExceptionCustomer(customerId: string, nextChecked: boolean): void {
  const set = new Set(selectedExceptionCustomerIds.value);
  if (nextChecked) {
    set.add(customerId);
  } else {
    set.delete(customerId);
  }
  selectedExceptionCustomerIds.value = [...set];
}

function onExceptionCheckboxChange(customerId: string, event: Event): void {
  const target = event.target as HTMLInputElement | null;
  toggleExceptionCustomer(customerId, Boolean(target?.checked));
}

async function saveExceptions(): Promise<void> {
  isSavingExceptions.value = true;
  try {
    const updated = await updateSettlementDirectExceptions(selectedExceptionCustomerIds.value);
    selectedExceptionCustomerIds.value = [...updated.customerIds];
    if (config.value) {
      config.value = {
        ...config.value,
        directExceptionCustomerIds: [...updated.customerIds],
      };
    }
    uiStore.showToast('Direct customer exceptions updated.', 'success');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update direct customer exceptions.';
    uiStore.showToast(message, 'error');
  } finally {
    isSavingExceptions.value = false;
  }
}

async function saveFlatPay(userId: string): Promise<void> {
  const rawInput = defaultFlatPayInputs[userId];
  const raw = rawInput === null || rawInput === undefined ? '' : String(rawInput).trim();
  const value = raw === '' ? null : Number(raw);

  if (raw !== '' && (!Number.isFinite(value) || value < 0)) {
    uiStore.showToast('Default flat pay must be a non-negative number or blank.', 'error');
    return;
  }

  savingFlatPayByUser[userId] = true;
  try {
    const result = await updateUserDefaultFlatPay(userId, value, Boolean(excludeFromPayrollInputs[userId]));
    defaultFlatPayInputs[userId] = result.defaultFlatPay === null ? '' : Number(result.defaultFlatPay).toFixed(2);
    excludeFromPayrollInputs[userId] = result.excludeFromPayroll;
    uiStore.showToast('User payroll settings updated.', 'success');
    emit('refresh');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update user payroll settings.';
    uiStore.showToast(message, 'error');
  } finally {
    savingFlatPayByUser[userId] = false;
  }
}

function monthText(month: number): string {
  return `${month}`.padStart(2, '0');
}

function monthYearText(month: number, year: number): string {
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
  return `${monthLabel}, ${year}`;
}

function entryTotal(rows: SettlementLoadEntry[]): number {
  return rows.reduce((sum, row) => sum + row.compensationAmount, 0);
}

function brokerUnitPay(detail: SettlementDetail): number {
  const brokerCount = detail.brokerLoads.length;
  if (brokerCount > 0) {
    return entryTotal(detail.brokerLoads) / brokerCount;
  }

  const directExceptionCount = detail.directExceptionLoads.length;
  if (directExceptionCount > 0) {
    return entryTotal(detail.directExceptionLoads) / directExceptionCount;
  }

  return activeBrokerPay.value;
}

function money(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function roleLabel(value: string): string {
  return value
    .split('_')
    .map((part) => `${part[0]}${part.slice(1).toLowerCase()}`)
    .join(' ');
}

function downloadPdf(): void {
  if (!settlementDetail.value) {
    return;
  }

  const anchor = document.createElement('a');
  anchor.href = getSettlementPdfUrl(settlementDetail.value.id, showDetailedPreview.value ? 'detailed' : 'summary');
  anchor.target = '_blank';
  anchor.click();
}

function closePreview(): void {
  showPreview.value = false;
}
</script>
