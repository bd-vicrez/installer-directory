'use client';
import QuoteRequestDialog, { type QuoteShop } from './QuoteRequestDialog';
export default function QuoteModal(props: { isOpen: boolean; onClose: () => void; installer: QuoteShop }) { return <QuoteRequestDialog {...props} />; }
