namespace TownsOfGyul.Domain.Cards;

// What a card yields; more than one option means the owner picks exactly one (OR-production).
public sealed record Production
{
    private readonly ResourceAmount[] _options;

    public Production(IReadOnlyList<ResourceAmount> options)
    {
        ArgumentNullException.ThrowIfNull(options);
        if (options.Count == 0)
        {
            throw new ArgumentException("Production needs at least one option.", nameof(options));
        }

        // Copied so the caller can't mutate the yield after construction.
        _options = options.ToArray();
    }

    public IReadOnlyList<ResourceAmount> Options
    {
        get
        {
            return _options;
        }
    }

    public bool IsChoice
    {
        get
        {
            return _options.Length > 1;
        }
    }

    public static Production Single(ResourceAmount yield)
    {
        ResourceAmount[] options = new[] { yield };
        return new Production(options);
    }

    public ResourceAmount Choose(int optionIndex)
    {
        if (optionIndex < 0 || optionIndex >= _options.Length)
        {
            throw new ArgumentOutOfRangeException(nameof(optionIndex), optionIndex, "No such production option.");
        }

        return _options[optionIndex];
    }

    // Value equality over the options; the default record equality would compare array references.
    public bool Equals(Production? other)
    {
        if (other is null)
        {
            return false;
        }

        return _options.SequenceEqual(other._options);
    }

    public override int GetHashCode()
    {
        HashCode hash = new HashCode();
        foreach (ResourceAmount option in _options)
        {
            hash.Add(option);
        }

        return hash.ToHashCode();
    }
}
