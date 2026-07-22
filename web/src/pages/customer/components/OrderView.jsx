import { CheckCircle, Minus, Package, Plus, ShoppingCart, Snowflake } from 'lucide-react';

export default function OrderView({
  products,
  selectedIceType,
  onSelectIceType,
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
  const iceTypeLabel = selectedIceType === 'tube' ? 'Tube Ice' : 'Crushed Ice';
  const itemTotal = (activeProduct?.price ?? 0) * quantity;
  const iceTypeOptions = [
    {
      id: 'tube',
      title: 'Tube Ice',
      description: 'Choose a tube ice size for your order.',
      image: '/TubeIce.jpg',
      icon: Package,
    },
    {
      id: 'crushed',
      title: 'Crushed Ice',
      description: 'Choose a crushed ice variation for your order.',
      image: '/CrushedIce.jpg',
      icon: Snowflake,
    },
  ];

  return (
    <>
      <div className="mb-8 flex items-center justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-[#52b1ec] via-[#4091c9] to-[#2c6f9e] p-8 text-white shadow-lg">
        <div className="relative z-10">
          <h1 className="mb-2 text-3xl font-extrabold sm:text-4xl">Premium Ice, Delivered Fresh</h1>
          <p className="text-lg text-blue-100">Choose your preferred ice type and size. </p>
          <p className="text-lg text-blue-100">We'll prepare your order for fast and reliable delivery.</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-gray-800">Select Ice Type</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {iceTypeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedIceType === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectIceType(option.id)}
                className={`overflow-hidden rounded-2xl border-2 text-left transition-all duration-300 ${isSelected ? 'border-[#4091c9] bg-[#4091c9] text-white shadow-md' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:shadow-sm'}`}
              >
                <div className="flex h-full flex-col">
                  <div className="relative h-48 w-full overflow-hidden bg-gray-50">
                    <img
                      src={option.image}
                      alt={option.title}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                        event.currentTarget.nextElementSibling.style.display = 'flex';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                    <div className="absolute right-4 top-4 hidden h-12 w-12 items-center justify-center rounded-full bg-white/80 text-[#4091c9] shadow-sm">
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold">{option.title}</h3>
                    <p className={`mt-1 text-sm ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>{option.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-gray-800">Select Variation / Size</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => onSelect(product.id)}
              className={`rounded-2xl border-2 p-4 text-left transition-all duration-300 ${selectedProductId === product.id ? 'border-[#4091c9] bg-[#4091c9] text-white shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:shadow-sm'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{product.name}</h3>
                  <p className={`mt-1 text-sm ${selectedProductId === product.id ? 'text-blue-100' : 'text-gray-500'}`}>{product.desc}</p>
                </div>
                <span className={`text-sm font-bold ${selectedProductId === product.id ? 'text-white' : 'text-[#4091c9]'}`}>
                  ₱{product.price.toFixed(2)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800">Details</h2>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-gray-800">{activeProduct.name}</h3>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#4091c9]">{iceTypeLabel}</p>
            <p className="mb-4 text-gray-600">{activeProduct.desc}</p>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-center"><CheckCircle className="mr-2 h-4 w-4 text-[#4091c9]" /> Purified & UV-Treated Water</li>
              <li className="flex items-center"><CheckCircle className="mr-2 h-4 w-4 text-[#4091c9]" /> Stored at optimal -18°C</li>
              <li className="flex items-center"><CheckCircle className="mr-2 h-4 w-4 text-[#4091c9]" /> Quality guaranteed</li>
            </ul>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-lg">
          <h2 className="mb-4 text-2xl font-bold text-gray-800">Quantity</h2>

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

              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Estimated total</span>
                  <span className="text-lg font-bold text-[#4091c9]">₱{itemTotal.toFixed(2)}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{quantity} item{quantity > 1 ? 's' : ''} × ₱{(activeProduct?.price ?? 0).toFixed(2)} each</p>
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
