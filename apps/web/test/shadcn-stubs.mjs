import { inject, provide } from 'vue';
import { ssrRenderSlot } from '@vue/server-renderer';

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, idx) => idx + start);
}

function getStubPaginationState(ctx) {
  const total = Number(ctx?.total ?? 0);
  const itemsPerPage = Number(ctx?.itemsPerPage || 1);
  const pageCount = Math.max(1, Math.ceil(total / itemsPerPage));
  const currentPage = Math.min(Math.max(1, Number(ctx?.page ?? 1)), pageCount);
  const siblingCount = Number(ctx?.siblingCount ?? 2);
  const showEdges = ctx?.showEdges === true || ctx?.showEdges === '';
  return { pageCount, currentPage, siblingCount, showEdges, disabled: Boolean(ctx?.disabled) };
}

/** Tính danh sách item trang/ellipsis khớp logic reka-ui PaginationList cho SSR stub. */
function buildStubPaginationItems(ctx) {
  const { pageCount, currentPage, siblingCount, showEdges } = getStubPaginationState(ctx);
  const firstPageIndex = 1;
  const lastPageIndex = pageCount;
  const leftSiblingIndex = Math.max(currentPage - siblingCount, firstPageIndex);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, lastPageIndex);

  let raw;
  if (showEdges) {
    const totalPageNumbers = Math.min(2 * siblingCount + 5, pageCount);
    const itemCount = totalPageNumbers - 2;
    const showLeftEllipsis =
      leftSiblingIndex > firstPageIndex + 2 &&
      Math.abs(lastPageIndex - itemCount - firstPageIndex + 1) > 2 &&
      Math.abs(leftSiblingIndex - firstPageIndex) > 2;
    const showRightEllipsis =
      rightSiblingIndex < lastPageIndex - 2 &&
      Math.abs(lastPageIndex - itemCount) > 2 &&
      Math.abs(lastPageIndex - rightSiblingIndex) > 2;

    if (!showLeftEllipsis && showRightEllipsis) {
      raw = [...range(1, itemCount), 'ellipsis', lastPageIndex];
    } else if (showLeftEllipsis && !showRightEllipsis) {
      raw = [firstPageIndex, 'ellipsis', ...range(lastPageIndex - itemCount + 1, lastPageIndex)];
    } else if (showLeftEllipsis && showRightEllipsis) {
      raw = [firstPageIndex, 'ellipsis', ...range(leftSiblingIndex, rightSiblingIndex), 'ellipsis', lastPageIndex];
    } else {
      raw = range(firstPageIndex, lastPageIndex);
    }
  } else {
    const itemCount = siblingCount * 2 + 1;
    if (pageCount < itemCount) raw = range(1, lastPageIndex);
    else if (currentPage <= siblingCount + 1) raw = range(firstPageIndex, itemCount);
    else if (pageCount - currentPage <= siblingCount) raw = range(pageCount - itemCount + 1, lastPageIndex);
    else raw = range(leftSiblingIndex, rightSiblingIndex);
  }

  return raw.map((value) => (typeof value === 'number' ? { type: 'page', value } : { type: 'ellipsis' }));
}

/**
 * Stub cho component shadcn-vue: render thành thẻ HTML thường, giữ nguyên attrs (data-testid, class...) và slot.
 * Bản thật phụ thuộc reka-ui và alias '@/', không chạy được trong Node thuần.
 */
const SHADCN_TAGS = {
  Button: 'button', Card: 'div', Input: 'input', Textarea: 'textarea', Label: 'label', Badge: 'span',
  Alert: 'div', AlertDescription: 'div', AlertTitle: 'h5',
  Table: 'table', TableHeader: 'thead', TableBody: 'tbody', TableRow: 'tr', TableHead: 'th', TableCell: 'td',
  Select: 'div', SelectContent: 'div', SelectItem: 'div', SelectValue: 'span', SelectTrigger: 'button',
  Dialog: 'div', DialogContent: 'div', DialogHeader: 'div', DialogTitle: 'h2', DialogDescription: 'p',
  AlertDialog: 'div', AlertDialogContent: 'div', AlertDialogHeader: 'div', AlertDialogTitle: 'h2',
  AlertDialogDescription: 'div', AlertDialogFooter: 'div',
  Tabs: 'div', TabsList: 'div', TabsTrigger: 'button', TabsContent: 'div',
  CardHeader: 'div', CardTitle: 'h3', CardContent: 'div', CardDescription: 'p',
  Pagination: 'div', PaginationContent: 'ul', PaginationItem: 'button', PaginationEllipsis: 'div',
  PaginationPrevious: 'button', PaginationNext: 'button',
};
// Chart của shadcn dựng bằng Unovis (cần DOM), nên SSR test chỉ ghi lại dữ liệu chart nhận được.
export const CHART_STUB = {
  inheritAttrs: false,
  props: ['data', 'index', 'categories', 'colors'],
  ssrRender(ctx, push) {
    const rows = ctx.data.map((r) => `<li data-chart-row="${r[ctx.index]}">${ctx.categories.map((c) => `${c}=${r[c]}`).join(';')}</li>`).join('');
    push(`<ul data-testid="chart-data" data-chart-categories="${ctx.categories.join('|')}">${rows}</ul>`);
  },
};
const VOID_TAGS = new Set(['input']);

const PAGINATION_CHILDREN = new Set(['PaginationContent', 'PaginationItem', 'PaginationPrevious', 'PaginationNext']);

export function shadcnStubs() {
  const out = {};
  for (const [name, tag] of Object.entries(SHADCN_TAGS)) {
    const extraProps =
      name === 'Pagination'
        ? ['as', 'page', 'total', 'itemsPerPage', 'siblingCount', 'showEdges', 'disabled']
        : name === 'PaginationItem'
          ? ['isActive']
          : [];
    out[name] = {
      inheritAttrs: false,
      props: ['open', 'modelValue', 'asChild', 'variant', 'size', ...extraProps],
      emits: ['update:open', 'update:modelValue'],
      setup(props) {
        if (name === 'Pagination') provide('stubPagination', props);
        if (PAGINATION_CHILDREN.has(name)) return { stubPagination: inject('stubPagination', null) };
        return {};
      },
      ssrRender(ctx, push, parent) {
        let slotProps = {};
        if (name === 'Pagination') {
          const { currentPage, pageCount } = getStubPaginationState(ctx);
          slotProps = { page: currentPage, pageCount };
        } else if (name === 'PaginationContent') {
          slotProps = { items: buildStubPaginationItems(ctx.stubPagination) };
        }
        const slot = () => ssrRenderSlot(ctx.$slots, 'default', slotProps, null, push, parent);
        // Dialog/AlertDialog chỉ render nội dung khi open=true, giống bản thật (Portal).
        if ((name === 'Dialog' || name === 'AlertDialog') ) {
          if (ctx.open) { push('<div>'); slot(); push('</div>'); }
          return;
        }
        const isPaginationAction =
          PAGINATION_CHILDREN.has(name) && name !== 'PaginationContent' && !('disabled' in ctx.$attrs);
        const paginationState = isPaginationAction ? getStubPaginationState(ctx.stubPagination) : null;
        const inheritedDisabled =
          paginationState !== null &&
          (paginationState.disabled ||
            (name === 'PaginationPrevious' && paginationState.currentPage === 1) ||
            (name === 'PaginationNext' && paginationState.currentPage === paginationState.pageCount));
        const a = Object.entries(ctx.$attrs)
          .filter(([k, v]) => typeof v !== 'function' && v !== undefined && v !== false && k !== 'onClick')
          .map(([k, v]) => ` ${k}="${String(v).replace(/"/g, '&quot;')}"`).join('') +
          (inheritedDisabled ? ' disabled="true"' : '');
        const type = name === 'Button' && !('type' in ctx.$attrs) ? ' type="button"' : '';
        const role = name === 'SelectTrigger' && !('role' in ctx.$attrs) ? ' role="combobox"' : '';
        const renderTag = name === 'Pagination' ? (ctx.as || tag) : tag;
        if (VOID_TAGS.has(renderTag)) { push(`<${renderTag}${a} />`); return; }
        push(`<${renderTag}${type}${role}${a}>`);
        if (name === 'PaginationEllipsis' && !ctx.$slots.default) {
          push('<span aria-hidden="true">…</span><span class="sr-only">More pages</span>');
        } else {
          slot();
        }
        push(`</${renderTag}>`);
      },
    };
  }
  out.BarChart = CHART_STUB;
  return out;
}

