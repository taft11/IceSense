import { CheckCircle, Minus, Package, Plus, ShoppingCart, Snowflake } from 'lucide-react';
import ProductCard from './ProductCard';

export default function OrderView({
  products,
  selectedProductId,
  onSelect,
  activeProduct,
  activeStock,
  quantity,
  onDecrease,
  onIncrease,
  onAddToCart,
  orderStatus,
  remainingStock,
}) {
  const isAddDisabled = orderStatus !== 'idle' || activeStock === 0 || remainingStock <= 0;

  return (
    <>
      <div className="mb-8 flex items-center justify-between overflow-hidden rounded-3xl bg-[#4091c9] p-8 text-white shadow-lg">
        <div className="relative z-10">
          <h1 className="mb-2 text-3xl font-extrabold sm:text-4xl">Place Your Order</h1>
          <p className="text-lg text-blue-100">Select a product below to place an order.</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-gray-800">Select Ice Type</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              selected={selectedProductId === product.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-800">Review Details</h2>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-gray-800">{activeProduct.name}</h3>
            <p className="mb-4 text-gray-600">{activeProduct.desc}</p>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-center"><CheckCircle className="mr-2 h-4 w-4 text-[#4091c9]" /> Purified & UV-Treated Water</li>
              <li className="flex items-center"><CheckCircle className="mr-2 h-4 w-4 text-[#4091c9]" /> Stored at optimal -18°C</li>
              <li className="flex items-center"><CheckCircle className="mr-2 h-4 w-4 text-[#4091c9]" /> Quality guaranteed</li>
            </ul>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-lg">
          <h2 className="mb-6 text-2xl font-bold text-gray-800">Quantity</h2>

          <form onSubmit={onAddToCart}>
            <div className="mb-6">
              <div className="flex w-fit items-center space-x-4 rounded-xl border border-gray-200 bg-gray-50 p-2">
                <button type="button" onClick={onDecrease} className="rounded-lg border border-gray-100 bg-white p-3 text-gray-800 shadow-sm transition hover:bg-gray-100">
                  <Minus className="h-5 w-5" />
                </button>
                <input type="number" readOnly value={quantity} className="w-16 bg-transparent text-center text-2xl font-bold focus:outline-none" />
                <button type="button" onClick={onIncrease} className="rounded-lg border border-gray-100 bg-white p-3 text-gray-800 shadow-sm transition hover:bg-gray-100" disabled={quantity >= activeStock}>
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isAddDisabled}
              className={`mb-6 flex w-full items-center justify-center rounded-xl p-4 text-lg font-bold shadow-md transition-all duration-300 ${orderStatus === 'idle' && activeStock > 0 && remainingStock > 0 ? 'bg-[#4091c9] text-white hover:bg-[#2d75aa] hover:-translate-y-0.5' : ''} ${orderStatus === 'processing' ? 'cursor-not-allowed bg-[#7aa8d1] text-white' : ''} ${orderStatus === 'success' ? 'bg-green-500 text-white' : ''} ${activeStock === 0 || remainingStock <= 0 ? 'cursor-not-allowed bg-gray-200 text-gray-500' : ''}`}
            >
              {orderStatus === 'idle' && activeStock > 0 && remainingStock > 0 && <><ShoppingCart className="mr-2 h-6 w-6" /> Add to Cart</>}
              {orderStatus === 'processing' && <><Snowflake className="mr-2 h-6 w-6 animate-spin" /> Processing...</>}
              {orderStatus === 'success' && <><CheckCircle className="mr-2 h-6 w-6" /> Added to Cart</>}
              {(activeStock === 0 || remainingStock <= 0) && 'Out of Stock'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
