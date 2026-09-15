'use client';
import QuoteRequestDialog from './QuoteRequestDialog';
export default function CityQuoteModal(props: { isOpen: boolean; onClose: () => void; locationLabel: string }) { return <QuoteRequestDialog {...props} />; }
