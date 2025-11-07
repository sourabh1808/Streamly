import Studio from '../models/Studio.js';

export const getAllStudios = async (req, res) => {
  try {
    const studios = await Studio.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json(studios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching studios' });
  }
};

export const createStudio = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Studio name is required' });
    }

    const studio = await Studio.create({
      name,
      owner: req.user._id
    });

    res.status(201).json(studio);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating studio' });
  }
};

export const getStudioById = async (req, res) => {
  try {
    const studio = await Studio.findById(req.params.id);

    if (!studio) {
      return res.status(404).json({ message: 'Studio not found' });
    }

    if (studio.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this studio' });
    }

    res.json(studio);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching studio' });
  }
};

export const getStudioByInviteCode = async (req, res) => {
  try {
    const studio = await Studio.findOne({ inviteCode: req.params.inviteCode });

    if (!studio) {
      return res.status(404).json({ message: 'Studio not found' });
    }

    res.json({
      _id: studio._id,
      name: studio.name,
      inviteCode: studio.inviteCode
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error joining studio' });
  }
};

export const deleteStudio = async (req, res) => {
  try {
    const studio = await Studio.findById(req.params.id);

    if (!studio) {
      return res.status(404).json({ message: 'Studio not found' });
    }

    if (studio.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this studio' });
    }

    await studio.deleteOne();
    res.json({ message: 'Studio deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting studio' });
  }
};
