import { CollectionsList } from '@client/features/bills/ui/collections/CollectionsList';
import { CollectionsDialog } from '@client/features/bills/ui/collections/CollectionsDialog';

export default function CollectionsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Collections</h1>
          <p className="text-gray-600 mt-2">Organize and manage your bill collections</p>
        </div>
        <CollectionsDialog onCollectionCreated={() => window.location.reload()} />
      </div>
      <CollectionsList />
    </div>
  );
}
