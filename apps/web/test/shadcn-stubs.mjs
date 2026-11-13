import { ssrRenderSlot } from '@vue/server-renderer';

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
  Pagination: 'div', PaginationContent: 'ul', PaginationItem: 'button', PaginationEllipsis: 'span',
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

export function shadcnStubs() {
  const out = {};
  for (const [name, tag] of Object.entries(SHADCN_TAGS)) {
    out[name] = {
      inheritAttrs: false,
      props: ['open', 'modelValue', 'asChild', 'variant', 'size'],
      emits: ['update:open', 'update:modelValue'],
      ssrRender(ctx, push, parent) {
        const slot = () => ssrRenderSlot(ctx.$slots, 'default', {}, null, push, parent);
        // Dialog/AlertDialog chỉ render nội dung khi open=true, giống bản thật (Portal).
        if ((name === 'Dialog' || name === 'AlertDialog') ) {
          if (ctx.open) { push('<div>'); slot(); push('</div>'); }
          return;
        }
        const a = Object.entries(ctx.$attrs)
          .filter(([k, v]) => typeof v !== 'function' && v !== undefined && v !== false && k !== 'onClick')
          .map(([k, v]) => ` ${k}="${String(v).replace(/"/g, '&quot;')}"`).join('');
        const type = name === 'Button' && !('type' in ctx.$attrs) ? ' type="button"' : '';
        const role = name === 'SelectTrigger' && !('role' in ctx.$attrs) ? ' role="combobox"' : '';
        if (VOID_TAGS.has(tag)) { push(`<${tag}${a} />`); return; }
        push(`<${tag}${type}${role}${a}>`);
        slot();
        push(`</${tag}>`);
      },
    };
  }
  out.BarChart = CHART_STUB;
  return out;
}

