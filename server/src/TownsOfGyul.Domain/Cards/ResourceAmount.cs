namespace TownsOfGyul.Domain.Cards;

// A concrete amount of gold/common/rare; used for production yields and resolved payments.
public sealed record ResourceAmount(int Gold = 0, int Common = 0, int Rare = 0)
{
    public static ResourceAmount None { get; } = new ResourceAmount();

    // Negative amounts are rejected so an amount can never act as a hidden loss or gain.
    public int Gold { get; } = EnsureNotNegative(Gold, nameof(Gold));

    public int Common { get; } = EnsureNotNegative(Common, nameof(Common));

    public int Rare { get; } = EnsureNotNegative(Rare, nameof(Rare));

    public bool IsEmpty
    {
        get
        {
            return Gold == 0 && Common == 0 && Rare == 0;
        }
    }

    // Builds an amount holding a single kind of resource, e.g. "3 common".
    public static ResourceAmount amountBuilderSingleKind(ResourceKind kind, int amount)
    {
        switch (kind)
        {
            case ResourceKind.Gold:
                return new ResourceAmount(Gold: amount);
            case ResourceKind.Common:
                return new ResourceAmount(Common: amount);
            case ResourceKind.Rare:
                return new ResourceAmount(Rare: amount);
            default:
                throw new ArgumentOutOfRangeException(nameof(kind), kind, "Unknown resource kind.");
        }
    }

    // Combines two amounts, e.g. a fixed cost plus the paid X.
    public static ResourceAmount operator +(ResourceAmount left, ResourceAmount right)
    {
        int gold = left.Gold + right.Gold;
        int common = left.Common + right.Common;
        int rare = left.Rare + right.Rare;
        return new ResourceAmount(gold, common, rare);
    }

    private static int EnsureNotNegative(int amount, string resourceName)
    {
        if (amount < 0)
        {
            throw new ArgumentOutOfRangeException(resourceName, amount, "Resource amounts cannot be negative.");
        }

        return amount;
    }
}
