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
  onQuantityChange,
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
      description: 'Perfect for homes, offices, and events that need reliable cooling.',
      image: '/TubeIce.jpg',
      icon: Package,
    },
    {
      id: 'crushed',
      title: 'Crushed Ice',
      description: 'Ideal for food service, drinks, and quick cooling needs.',
      image: '/CrushedIce.jpg',
      icon: Snowflake,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[30px] border border-sky-100 bg-gradient-to-br from-[#52b1ec] via-[#4091c9] to-[#174f78] p-8 text-white shadow-[0_20px_60px_-20px_rgba(15,23,42,0.45)]">
        <div className="max-w-3xl">
          <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">
            Fast, clean, dependable delivery
          </p>
          <h1 className="mb-3 text-3xl font-extrabold sm:text-4xl">Order ice the simple way</h1>
          <p className="max-w-2xl text-lg text-sky-50">
            Pick the ice type, choose the size that fits your needs, and add it to your cart in just a few steps.
          </p>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900">Choose your ice format</h2>
          <p className="mt-1 text-sm text-slate-500">Select the type of ice that best suits your order.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {iceTypeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedIceType === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectIceType(option.id)}
                className={`overflow-hidden rounded-[24px] border-2 text-left transition-all duration-300 ${
                  isSelected
                    ? 'border-[#4091c9] bg-[#4091c9] text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:shadow-sm'
                }`}
              >
                <div className="flex h-full flex-col">
                  <div className="relative h-48 w-full overflow-hidden bg-slate-50">
                    <img
                      src={option.image}
                      alt={option.title}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                        event.currentTarget.nextElementSibling.style.display = 'flex';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    <div className="absolute right-4 top-4 hidden h-12 w-12 items-center justify-center rounded-full bg-white/80 text-[#4091c9] shadow-sm">
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold">{option.title}</h3>
                    <p className={`mt-1 text-sm ${isSelected ? 'text-sky-100' : 'text-slate-500'}`}>{option.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900">Select your package size</h2>
          <p className="mt-1 text-sm text-slate-500">Choose the quantity that fits your needs and budget.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => onSelect(product.id)}
              className={`rounded-[22px] border-2 p-4 text-left transition-all duration-300 ${
                selectedProductId === product.id
                  ? 'border-[#4091c9] bg-[#4091c9] text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{product.name}</h3>
                  <p className={`mt-1 text-sm ${selectedProductId === product.id ? 'text-sky-100' : 'text-slate-500'}`}>{product.desc}</p>
                </div>
                <span className={`shrink-0 text-sm font-bold ${selectedProductId === product.id ? 'text-white' : 'text-[#4091c9]'}`}>
                  ₱{product.price.toFixed(2)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Why customers choose this</h2>

          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{activeProduct.name}</h3>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-[#4091c9]">{iceTypeLabel}</span>
            </div>
            <p className="mb-4 text-slate-600">{activeProduct.desc}</p>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-center"><CheckCircle className="mr-2 h-4 w-4 text-[#4091c9]" /> Purified and UV-treated water</li>
              <li className="flex items-center"><CheckCircle className="mr-2 h-4 w-4 text-[#4091c9]" /> Stored at optimal -18°C conditions</li>
              <li className="flex items-center"><CheckCircle className="mr-2 h-4 w-4 text-[#4091c9]" /> Quality guaranteed for every delivery</li>
            </ul>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Select quantity</h2>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">Ready to order</span>
          </div>

          <form onSubmit={onAddToCart}>
            <div className="mb-6">
              <div className="flex w-fit items-center space-x-4 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                <button type="button" onClick={onDecrease} className="rounded-xl border border-slate-200 bg-white p-3 text-slate-800 shadow-sm transition hover:bg-slate-100">
                  <Minus className="h-5 w-5" />
                </button>
                <input type="number" readOnly value={quantity} className="w-16 bg-transparent text-center text-2xl font-bold focus:outline-none" />
                <button type="button" onClick={onIncrease} className="rounded-lg border border-gray-100 bg-white p-3 text-gray-800 shadow-sm transition hover:bg-gray-100" disabled={quantity >= activeStock}>
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Estimated total</span>
                  <span className="text-lg font-bold text-[#4091c9]">₱{itemTotal.toFixed(2)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{quantity} item{quantity > 1 ? 's' : ''} × ₱{(activeProduct?.price ?? 0).toFixed(2)} each</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isAddDisabled}
              className={`flex w-full items-center justify-center rounded-2xl p-4 text-lg font-bold shadow-md transition-all duration-300 ${
                orderStatus === 'idle' && activeStock > 0 && remainingStock > 0 ? 'bg-[#4091c9] text-white hover:bg-[#2d75aa] hover:-translate-y-0.5' : ''
              } ${orderStatus === 'processing' ? 'cursor-not-allowed bg-[#7aa8d1] text-white' : ''} ${
                orderStatus === 'success' ? 'bg-green-500 text-white' : ''
              } ${activeStock === 0 || remainingStock <= 0 ? 'cursor-not-allowed bg-slate-200 text-slate-500' : ''}`}
            >
              {orderStatus === 'idle' && activeStock > 0 && remainingStock > 0 && <><ShoppingCart className="mr-2 h-6 w-6" /> Add to Cart</>}
              {orderStatus === 'processing' && <><Snowflake className="mr-2 h-6 w-6 animate-spin" /> Processing...</>}
              {orderStatus === 'success' && <><CheckCircle className="mr-2 h-6 w-6" /> Added to Cart</>}
              {(activeStock === 0 || remainingStock <= 0) && 'Out of Stock'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
