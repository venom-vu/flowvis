<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import type { LegalDocument } from "~/content/legal/terms";

withDefaults(
  defineProps<{
    doc: LegalDocument;
    testid: string;
    contactEmail?: string;
    zaloUrl?: string | null;
    companionTo?: string;
    companionLabel?: string;
    contactTestid?: string;
  }>(),
  {
    contactEmail: "",
    zaloUrl: null,
    companionTo: "",
    companionLabel: "",
    contactTestid: "legal-contact-email",
  },
);

// Đánh dấu mục đang đọc trong mục lục bên phải.
const activeId = ref<string>("");
let observer: IntersectionObserver | null = null;

onMounted(() => {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>("[data-legal-section]"),
  );
  if (nodes.length === 0 || typeof IntersectionObserver === "undefined") return;
  activeId.value = nodes[0]?.id ?? "";
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) activeId.value = visible.target.id;
    },
    { rootMargin: "-90px 0px -65% 0px" },
  );
  nodes.forEach((n) => observer?.observe(n));
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <!-- Menu trái và mục lục phải dùng position: fixed (từ lg trở lên); cột lưới giữ chỗ cho chúng -->
  <div
    class="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 py-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 lg:py-8 xl:grid-cols-[240px_minmax(0,1fr)_208px]"
    :data-testid="testid"
  >
    <div class="lg:w-[240px]">
      <aside
        aria-label="Điều hướng tài liệu pháp lý"
        data-testid="legal-sidebar"
        class="lg:fixed lg:bottom-6 lg:top-[92px] lg:left-[max(2rem,calc((100vw-80rem)/2+2rem))] lg:w-[240px] lg:overflow-y-auto"
      >
        <nav aria-label="Tài liệu pháp lý" class="flex flex-col gap-1">
          <p
            class="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-cyber-muted"
          >
            Pháp lý
          </p>
          <NuxtLink
            to="/terms"
            class="touch-target flex min-h-[48px] items-center rounded-md px-3 text-sm transition lg:min-h-[40px]"
            :class="
              testid === 'page-terms'
                ? 'bg-cyber-violet/15 font-medium text-cyber-text'
                : 'text-cyber-muted hover:bg-white/5 hover:text-cyber-text'
            "
          >
            Điều khoản dịch vụ
          </NuxtLink>
          <NuxtLink
            to="/privacy"
            class="touch-target flex min-h-[48px] items-center rounded-md px-3 text-sm transition lg:min-h-[40px]"
            :class="
              testid === 'page-privacy'
                ? 'bg-cyber-violet/15 font-medium text-cyber-text'
                : 'text-cyber-muted hover:bg-white/5 hover:text-cyber-text'
            "
          >
            Chính sách quyền riêng tư
          </NuxtLink>
        </nav>

        <!-- Dưới xl chưa có cột mục lục bên phải: hiện mục lục thu gọn tại đây -->
        <details
          class="group mt-3 border-t border-cyber-border/60 pt-3 xl:hidden"
        >
          <summary
            class="touch-target flex min-h-[48px] cursor-pointer list-none items-center justify-between px-3 text-xs font-semibold uppercase tracking-wider text-cyber-muted"
          >
            Mục lục
            <Icon
              name="lucide:chevron-down"
              class="h-4 w-4 transition group-open:rotate-180"
            />
          </summary>
          <ol class="mt-1 space-y-0.5">
            <li v-for="s in doc.sections" :key="s.id">
              <a
                :href="`#${s.id}`"
                class="block rounded-md px-3 py-2 text-sm leading-5 text-cyber-muted transition hover:bg-white/5 hover:text-cyber-text"
              >
                {{ s.heading }}
              </a>
            </li>
          </ol>
        </details>
      </aside>
    </div>

    <article class="min-w-0">
      <header class="border-b border-cyber-border/60 pb-6">
        <p
          class="text-xs font-semibold uppercase tracking-widest text-cyber-cyan/90"
        >
          Pháp lý · flowvis
        </p>
        <h1
          class="mt-2 font-display text-3xl font-bold tracking-tight text-cyber-text sm:text-4xl"
        >
          {{ doc.title }}
        </h1>
        <p class="mt-3 text-base leading-7 text-slate-300">
          {{ doc.subtitle }}
        </p>
        <div
          class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cyber-muted"
        >
          <span
            >Có hiệu lực từ
            <time class="text-slate-300">{{ doc.effectiveDate }}</time></span
          >
          <span aria-hidden="true" class="text-cyber-border">·</span>
          <span
            >Cập nhật
            <time class="text-slate-300">{{ doc.updatedAt }}</time></span
          >
          <span aria-hidden="true" class="text-cyber-border">·</span>
          <span class="font-mono">Phiên bản {{ doc.version }}</span>
          <template v-if="doc.status === 'final'">
            <span aria-hidden="true" class="text-cyber-border">·</span>
            <span data-testid="legal-final-badge" class="text-cyber-success">
              Văn bản chính thức
            </span>
          </template>
        </div>
        <LegalDraftBanner v-if="doc.status === 'draft'" class="mt-5" />
      </header>

      <div class="mt-8 space-y-9">
        <section
          v-for="s in doc.sections"
          :id="s.id"
          :key="s.id"
          data-legal-section
          class="scroll-mt-[92px] space-y-3"
        >
          <h2
            class="font-display text-lg font-semibold tracking-tight text-cyber-text sm:text-xl"
          >
            {{ s.heading }}
          </h2>
          <p
            v-for="(p, i) in s.paragraphs"
            :key="`p-${i}`"
            class="text-[15px] leading-7 text-slate-300"
          >
            {{ p }}
          </p>
          <ul
            v-if="s.bullets && s.bullets.length > 0"
            class="list-disc space-y-1.5 pl-5 text-[15px] leading-7 text-slate-300 marker:text-slate-500"
          >
            <li v-for="(item, idx) in s.bullets" :key="`b-${idx}`">
              {{ item }}
            </li>
          </ul>
          <p
            v-for="(p, i) in s.outroParagraphs ?? []"
            :key="`o-${i}`"
            class="text-[15px] leading-7 text-slate-300"
          >
            {{ p }}
          </p>
        </section>
      </div>

      <section
        v-if="contactEmail || zaloUrl"
        aria-labelledby="legal-contact-heading"
        class="mt-12 space-y-2.5 border-t border-cyber-border/60 pt-8 text-sm leading-6 text-cyber-muted"
      >
        <h2
          id="legal-contact-heading"
          class="font-display text-base font-semibold text-cyber-text"
        >
          Liên hệ hỗ trợ
        </h2>
        <p>
          Mọi thắc mắc, báo cáo vi phạm, đối soát giao dịch hoặc yêu cầu xóa dữ
          liệu, vui lòng liên hệ:
        </p>
        <ul class="space-y-1 text-slate-300">
          <li v-if="contactEmail" :data-testid="contactTestid">
            Email:
            <a
              :href="`mailto:${contactEmail}`"
              class="text-cyber-cyan underline underline-offset-4 transition hover:text-cyber-text"
              >{{ contactEmail }}</a
            >
          </li>
          <li v-if="zaloUrl">
            Hỗ trợ trực tuyến:
            <a
              :href="zaloUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-cyber-cyan underline underline-offset-4 transition hover:text-cyber-text"
              >Kênh Zalo chính thức</a
            >
          </li>
        </ul>
      </section>
    </article>

    <div class="hidden xl:block xl:w-[208px]">
      <nav
        aria-label="Mục lục nội dung"
        data-testid="legal-toc"
        class="fixed bottom-6 top-[92px] right-[max(2rem,calc((100vw-80rem)/2+2rem))] w-[208px] overflow-y-auto border-l border-cyber-border/60 pl-4"
      >
        <h2
          class="pb-2 text-xs font-semibold uppercase tracking-wider text-cyber-muted"
        >
          Mục lục
        </h2>
        <ol class="space-y-0.5">
          <li v-for="s in doc.sections" :key="s.id">
            <a
              :href="`#${s.id}`"
              class="block py-1 text-[13px] leading-5 transition"
              :class="
                activeId === s.id
                  ? 'font-medium text-cyber-cyan'
                  : 'text-cyber-muted hover:text-cyber-text'
              "
            >
              {{ s.heading }}
            </a>
          </li>
        </ol>
      </nav>
    </div>
  </div>
</template>
