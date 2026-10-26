using System;


namespace TownsOfGyul.Domain.Cards;

// A printed card cost: a fixed part plus an optional X paid in one resource kind.
public sealed record CardCost(ResourceAmount Fixed, ResourceKind? VariableResource = null)
{
    public static CardCost None { get; } = new CardCost(ResourceAmount.None);

    public ResourceAmount Fixed { get; } = EnsureNotNull(Fixed);

    public bool HasVariableX
    {
        get
        {
            return VariableResource.HasValue;
        }
    }

    public bool IsFree
    {
        get
        {
            return Fixed.IsEmpty && !HasVariableX;
        }
    }

    // Turns the printed cost into the concrete amount to pay once the player has picked X.
    public ResourceAmount Resolve(int x)
    {
        if (x < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(x), x, "X can not be negative");
        }

        if (!HasVariableX && x != 0)
        {
            throw new ArgumentException("This cost has no X, so X must be 0.", nameof(x));
        }

        ResourceAmount variableValue = ResourceAmount.None;

        if (HasVariableX)
        {
            variableValue = ResourceAmount.amountBuilderSingleKind(VariableResource.Value, x);
        }

        var resolvedAmount = Fixed + variableValue;
        return resolvedAmount;
    }

    private static ResourceAmount EnsureNotNull(ResourceAmount fixedPart)
    {
        ArgumentNullException.ThrowIfNull(fixedPart, nameof(Fixed));
        return fixedPart;
    }
}
