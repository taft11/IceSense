import { Package } from 'lucide-react';

export default function ProductCard({ product, selected, onSelect }) {
  return (
    <div
      onClick={() => onSelect(product.id)}
      className={`cursor-pointer rounded-2xl p-4 border-2 transition-all duration-300 text-center flex flex-col items-center shadow-sm bg-white hover:shadow-md ${selected ? 'border-[#4091c9] ring-4 ring-[#4091c9]/20 transform -translate-y-1' : 'border-gray-100 hover:border-blue-200'}`}
    >
      <div className="mb-3 flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg p-2">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
            event.currentTarget.nextElementSibling.style.display = 'block';
          }}
        />
        <Package className="hidden h-10 w-10 text-gray-300" />
      </div>
      <h3 className={`font-bold text-sm ${selected ? 'text-[#4091c9]' : 'text-gray-700'}`}>{product.name}</h3>
      <p className="mt-1 text-xs text-gray-500">₱{product.price.toFixed(2)}</p>
    </div>
  );
}
